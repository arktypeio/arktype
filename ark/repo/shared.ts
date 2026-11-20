import {
	fileName,
	findPackageAncestors,
	readJson,
	readPackageJson
} from "@ark/fs"
import { flatMorph, throwInternalError } from "@ark/util"
import { join } from "node:path"
import type { PackageJson } from "type-fest"

// allow other utils invoked from build to bootstrap utils

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export * as bootstrapFs from "../fs/index.ts"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export * as bootstrapUtil from "../util/index.ts"

const root = findPackageAncestors().find(
	dir => readPackageJson(dir).name === "ark"
)

if (!root) throwInternalError(`Can't find repo root from ${fileName()}!`)

const arkDir = join(root, "ark")
const docs = join(arkDir, "docs")

export const repoDirs = {
	root,
	arkDir,
	docs,
	repo: join(arkDir, "repo")
}

export const packageScopes = [
	"aot",
	"attest",
	"fast-check",
	"fs",
	"regex",
	"schema",
	"sets",
	"type",
	"util"
] as const

export type PackageScope = (typeof packageScopes)[number]

export type ArkPackage = {
	scope: PackageScope
	path: string
	packageJsonPath: string
	name: string
	version: string
	json: PackageJson
}

export const packagesByScope = flatMorph(
	packageScopes,
	(i, scope): [PackageScope, ArkPackage] => {
		const path = join(arkDir, scope)
		const packageJsonPath = join(path, "package.json")
		const json = readJson(packageJsonPath) as PackageJson
		return [
			scope,
			{
				scope,
				path,
				packageJsonPath,
				json,
				name: json.name!,
				version: json.version!
			}
		]
	}
)

export const packages = Object.values(packagesByScope)

const workspaceDependenciesOf = (pkg: ArkPackage) =>
	Object.keys({
		...pkg.json.dependencies,
		...pkg.json.optionalDependencies,
		...pkg.json.peerDependencies
	}).flatMap(name => packages.filter(dependency => dependency.name === name))

const installedDependenciesOf = (pkg: ArkPackage) =>
	Object.keys({ ...pkg.json.dependencies, ...pkg.json.optionalDependencies })

const dependencyOrder: ArkPackage[] = []

const addToDependencyOrder = (pkg: ArkPackage, dependents: ArkPackage[]) => {
	if (dependencyOrder.includes(pkg)) return
	if (dependents.includes(pkg)) {
		throwInternalError(
			`${[...dependents, pkg].map(({ name }) => name).join(" -> ")} is a cycle`
		)
	}
	for (const dependency of workspaceDependenciesOf(pkg))
		addToDependencyOrder(dependency, [...dependents, pkg])
	dependencyOrder.push(pkg)
}

for (const pkg of packages) addToDependencyOrder(pkg, [])

// arktype and whatever installs it, e.g. @ark/attest
const installsType = new Set([packagesByScope.type.name])
for (const pkg of dependencyOrder) {
	if (installedDependenciesOf(pkg).some(name => installsType.has(name)))
		installsType.add(pkg.name)
}

/**
 * each package after those it depends on, so none is installable before them,
 * and arktype after every package that doesn't install it. A peer needn't be
 * on npm first, so a run that fails partway leaves latest at the previous
 * arktype rather than at one whose docs name a package that isn't out yet,
 * like @ark/aot.
 */
export const publishOrder: ArkPackage[] = [
	...dependencyOrder.filter(
		pkg => !pkg.json.private && !installsType.has(pkg.name)
	),
	...dependencyOrder.filter(
		pkg => !pkg.json.private && installsType.has(pkg.name)
	)
]

/** the versions of a package on npm, none if it isn't there yet */
export const publishedVersionsOf = async (name: string): Promise<string[]> => {
	const response = await fetch(
		`https://registry.npmjs.org/${name.replace("/", "%2f")}`,
		{ headers: { accept: "application/vnd.npm.install-v1+json" } }
	)
	if (response.status === 404) return []
	if (!response.ok)
		throw new Error(`npm responded ${response.status} for ${name}`)
	const { versions } = (await response.json()) as {
		versions: Record<string, unknown>
	}
	return Object.keys(versions)
}

const npmFetchTimeoutMs = 15_000
const maxNpmFetchAttempts = 3

const npmUrlOf = (name: string, path = "") =>
	`https://registry.npmjs.org/${name.replace("/", "%2f")}${path}`

// retries a timeout, a 429 or a 5xx, and returns any other response
const fetchNpm = async (url: string): Promise<Response> => {
	for (let attempt = 1; ; attempt++) {
		let response: Response
		try {
			response = await fetch(url, {
				signal: AbortSignal.timeout(npmFetchTimeoutMs)
			})
		} catch (e) {
			if (attempt >= maxNpmFetchAttempts) throw e
			await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
			continue
		}
		const isTransient = response.status === 429 || response.status >= 500
		if (!isTransient || attempt >= maxNpmFetchAttempts) return response
		await response.body?.cancel()
		await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
	}
}

/**
 * whether a specific version of a package is on npm. Queries the uncached
 * per-version endpoint rather than the packument, which is CDN-cached and
 * omits versions still in npm's async PUT 202 processing queue.
 */
export const isVersionOnNpm = async (
	name: string,
	version: string
): Promise<boolean> => {
	const response = await fetchNpm(npmUrlOf(name, `/${version}`))
	await response.body?.cancel()
	if (response.status === 200) return true
	if (response.status === 404) return false
	throw new Error(`npm responded ${response.status} for ${name}@${version}`)
}

type Packument = {
	versions?: Record<string, unknown>
	time?: Record<string, string>
}

export type NpmVersionStatus = "published" | "unpublished" | "absent"

/**
 * what the full packument says of a version: "published" if it lists it,
 * "unpublished" if its `time` records a publish its `versions` no longer has
 * (npm never lets that version be reused), or "absent" if it has neither,
 * as for a version npm is still processing
 */
export const npmVersionStatusOf = async (
	name: string,
	version: string
): Promise<NpmVersionStatus> => {
	const response = await fetchNpm(npmUrlOf(name))
	if (response.status === 404) {
		await response.body?.cancel()
		return "absent"
	}
	if (!response.ok) {
		await response.body?.cancel()
		throw new Error(`npm responded ${response.status} for ${name}`)
	}
	const packument = (await response.json()) as Packument
	return (
		packument.versions?.[version] ? "published"
		: packument.time?.[version] ? "unpublished"
		: "absent"
	)
}

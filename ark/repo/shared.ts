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
	"json-schema",
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

/** each package after those it depends on, so none is installable before them */
export const publishOrder: ArkPackage[] = []

const addToPublishOrder = (pkg: ArkPackage, dependents: ArkPackage[]) => {
	if (publishOrder.includes(pkg)) return
	if (dependents.includes(pkg)) {
		throwInternalError(
			`${[...dependents, pkg].map(({ name }) => name).join(" -> ")} is a cycle`
		)
	}
	for (const dependency of workspaceDependenciesOf(pkg))
		addToPublishOrder(dependency, [...dependents, pkg])
	publishOrder.push(pkg)
}

for (const pkg of packages) addToPublishOrder(pkg, [])

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

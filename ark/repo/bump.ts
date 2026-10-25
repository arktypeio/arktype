import { getShellOutput, readFile, rewriteFile, writeFile } from "@ark/fs"
import { existsSync } from "node:fs"
import { join } from "node:path"
import {
	packages,
	packagesByScope,
	publishedVersionsOf,
	repoDirs,
	type ArkPackage
} from "./shared.ts"

// sets the version of every package, given as name@version, e.g.
// pnpm bump arktype@X.Y.Z @ark/schema@X.Y.Z ...
// along with each file that names one, and heads each CHANGELOG's unreleased
// changes with their version. Packages depend on each other's exact versions,
// so they're released together and each needs a version npm doesn't have yet.

const nextVersions = new Map<string, string>()
for (const arg of process.argv.slice(2)) {
	const at = arg.lastIndexOf("@")
	if (at <= 0) throw new Error(`Expected name@version, got ${arg}`)
	nextVersions.set(arg.slice(0, at), arg.slice(at + 1))
}

const semver = /^\d+\.\d+\.\d+(-[\da-z-]+(\.[\da-z-]+)*)?$/i

const publishedVersions = new Map(
	await Promise.all(
		packages.map(
			async pkg => [pkg, await publishedVersionsOf(pkg.name)] as const
		)
	)
)

const problems = [
	...[...nextVersions.keys()]
		.filter(name => !packages.some(pkg => pkg.name === name))
		.map(name => `${name} isn't a package`),
	...packages.flatMap(pkg => {
		const next = nextVersions.get(pkg.name)
		return (
			next === undefined ? [`${pkg.name} needs a version (now ${pkg.version})`]
			: !semver.test(next) ? [`${pkg.name}@${next} isn't a semver version`]
			: next === pkg.version ? [`${pkg.name} is already ${next}`]
			: publishedVersions.get(pkg)!.includes(next) ?
				[`${pkg.name}@${next} is already on npm`]
			:	[]
		)
	})
]

if (problems.length) {
	console.error(problems.join("\n"))
	process.exit(1)
}

const tracked = (text: string) =>
	getShellOutput(
		`git grep --files-with-matches --fixed-strings -e '${text}' -- ':!*CHANGELOG.md' || true`,
		{ cwd: repoDirs.root }
	)
		.split("\n")
		.filter(Boolean)
		.map(path => join(repoDirs.root, path))

const replaceTracked = (
	text: string,
	replace: (contents: string) => string
) => {
	for (const path of tracked(text)) {
		const contents = readFile(path)
		const replaced = replace(contents)
		if (replaced === contents) continue
		writeFile(path, replaced)
		console.log(`updated ${path}`)
	}
}

const escape = (text: string) => text.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")

// the sections a release names: what's unreleased, a version that was never
// published and, for a stable version, its prereleases
const headChangelog = (pkg: ArkPackage, next: string) => {
	const path = join(pkg.path, "CHANGELOG.md")
	if (!existsSync(path)) return
	const lines = readFile(path).split("\n")
	let headed = false
	for (let i = 0; i < lines.length; i++) {
		const heading = /^## (.+)$/.exec(lines[i])?.[1]
		if (heading === undefined) continue
		const isReleased =
			heading === "Unreleased" ||
			(heading === pkg.version &&
				!publishedVersions.get(pkg)!.includes(pkg.version)) ||
			(!next.includes("-") && heading.startsWith(`${next}-`))
		if (!isReleased) break
		if (headed) {
			lines.splice(i, lines[i + 1] === "" ? 2 : 1)
			i--
		} else lines[i] = `## ${next}`
		headed = true
	}
	if (headed) {
		rewriteFile(path, () => lines.join("\n"))
		console.log(`updated ${path}`)
	}
}

for (const pkg of packages) {
	const next = nextVersions.get(pkg.name)!
	rewriteFile(pkg.packageJsonPath, contents => {
		const bumped = contents.replace(/^(\t"version": )"[^"]*"/m, `$1"${next}"`)
		if (bumped === contents)
			throw new Error(`Found no version in ${pkg.packageJsonPath}`)
		return bumped
	})
	console.log(`${pkg.name} ${pkg.version} -> ${next}`)
	headChangelog(pkg, next)
}

// the @ark/aot released with arktype, which a version mismatch tells a
// program to install
const nextAot = nextVersions.get("@ark/aot")!
rewriteFile(packagesByScope.type.packageJsonPath, contents => {
	const bumped = contents.replace(
		/^(\t"arkAotVersion": )"[^"]*"/m,
		`$1"${nextAot}"`
	)
	if (bumped === contents) {
		throw new Error(
			`Found no arkAotVersion in ${packagesByScope.type.packageJsonPath}`
		)
	}
	return bumped
})

const util = packagesByScope.util
const nextUtil = nextVersions.get(util.name)!
// registry.ts, and the copy of its declarations the playground loads
replaceTracked(`arkUtilVersion = `, contents =>
	contents.replace(
		new RegExp(`(arkUtilVersion = \\\\?")${escape(util.version)}(\\\\?")`, "g"),
		(_, before: string, after: string) => `${before}${nextUtil}${after}`
	)
)

const type = packagesByScope.type
const nextType = nextVersions.get(type.name)!
const versionExportOf = (version: string) =>
	`precompiledForArktype_${version.replace(/\W/g, "_")}`

// runtime.ts's export, and the docs that show it
replaceTracked(versionExportOf(type.version), contents =>
	contents.replace(
		new RegExp(`${versionExportOf(type.version)}(?!\\w)`, "g"),
		versionExportOf(nextType)
	)
)

// the docs' example of a version mismatch: the previous version against this
// one, or the one before its prereleases
replaceTracked(`runs on ${type.version}`, contents =>
	contents.replace(
		new RegExp(
			`(${escape(type.name)} resolves to )([^,\\s]+)(, but \\S+ runs on )${escape(type.version)}(?![\\w.-])`,
			"g"
		),
		(_, resolvesTo: string, previous: string, runsOn: string) =>
			`${resolvesTo}${type.version.startsWith(`${nextType}-`) ? previous : type.version}${runsOn}${nextType}`
	)
)

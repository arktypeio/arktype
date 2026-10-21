import { getShellOutput, rewriteJson, shell } from "@ark/fs"
import { packages, type ArkPackage, type PackageScope } from "./shared.ts"

const releasesToCreate: string[] = []

const existingTags = getShellOutput("git tag").split("\n")

const publishPackage = (pkg: ArkPackage, alias?: string) => {
	const tagName = `${alias ?? pkg.name}@${pkg.version}`

	if (!existingTags.includes(tagName)) {
		if (alias) rewritePackageJsonName(pkg.packageJsonPath, alias)

		const distTag = distTagOf(pkg.version)
		shell(`git tag ${tagName}`)
		releasesToCreate.push(
			`${tagName} ${distTag === "latest" ? "--latest" : "--prerelease"}`
		)
		shell(`pnpm publish --no-git-checks --tag ${distTag}`, { cwd: pkg.path })

		if (alias) rewritePackageJsonName(pkg.packageJsonPath, pkg.name)
	}
}

const rewritePackageJsonName = (path: string, alias: string) =>
	rewriteJson(path, data => ({ ...data, name: alias }))

// npm rejects a prerelease published without a dist-tag
const distTagOf = (version: string) =>
	/-([a-z]+)/.exec(version)?.[1] ?? "latest"

// whether a package also ships as the @arktype/ name it had before @ark/
const hasLegacyAlias = {
	attest: true,
	"fast-check": true,
	fs: true,
	"json-schema": true,
	precompile: false,
	regex: true,
	schema: true,
	sets: false,
	type: true,
	util: true
} satisfies Record<PackageScope, boolean>

for (const pkg of packages) {
	// primary name (either arktype, arkregex, arksets or @ark/*)
	publishPackage(pkg)

	// scoped alias for primary entry point
	if (pkg.scope === "type") publishPackage(pkg, "@ark/type")
	if (pkg.scope === "regex") publishPackage(pkg, "@ark/regex")
	if (pkg.scope === "sets") publishPackage(pkg, "@ark/sets")

	if (hasLegacyAlias[pkg.scope]) publishPackage(pkg, `@arktype/${pkg.scope}`)
}

shell("git push --tags")

for (const release of releasesToCreate) shell(`gh release create ${release}`)

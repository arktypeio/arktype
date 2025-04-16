import { getShellOutput, rewriteJson, shell } from "@ark/fs"
import { packages, type ArkPackage } from "./shared.ts"

const tagsToPublish: string[] = []

const existingTags = getShellOutput("git tag").split("\n")

const publishPackage = (pkg: ArkPackage, alias?: string) => {
	const tagName = `${alias ?? pkg.name}@${pkg.version}`

	if (!existingTags.includes(tagName)) {
		if (alias) rewritePackageJsonName(pkg.packageJsonPath, alias)

		shell(`git tag ${tagName}`)
		tagsToPublish.push(tagName)
		shell("pnpm publish --no-git-checks", { cwd: pkg.path })

		if (alias) rewritePackageJsonName(pkg.packageJsonPath, pkg.name)
	}
}

const rewritePackageJsonName = (path: string, alias: string) =>
	rewriteJson(path, data => ({ ...data, name: alias }))

for (const pkg of packages) {
	// primary name (either arktype or @ark/*)
	publishPackage(pkg)

	// scoped alias for primary entry point
	if (pkg.scope === "type") publishPackage(pkg, "@ark/type")
	else {
		// alias for original @arktype/ scope
		publishPackage(pkg, `@arktype/${pkg.scope}`)
	}
}

shell("git push --tags")

for (const tagName of tagsToPublish)
	shell(`gh release create ${tagName} --latest`)

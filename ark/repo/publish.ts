import { getShellOutput, shell } from "@ark/fs"
import { packages } from "./shared.ts"

const tagsToPublish: string[] = []

const existingTags = getShellOutput("git tag").split("\n")

// each package publishes under exactly one name: the @arktype/ aliases and
// @ark/type and @ark/regex were dropped (and deprecated on npm), since every
// extra name is another identity CI can publish and a way to end up with two
// copies of the same runtime
for (const pkg of packages) {
	const tagName = `${pkg.name}@${pkg.version}`

	if (!existingTags.includes(tagName)) {
		shell(`git tag ${tagName}`)
		tagsToPublish.push(tagName)
		shell("pnpm publish --no-git-checks", { cwd: pkg.path })
	}
}

shell("git push --tags")

for (const tagName of tagsToPublish)
	shell(`gh release create ${tagName} --latest`)

import { getShellOutput, shell } from "@arktype/fs"
import { flatMorph } from "@arktype/util"
import { type } from "arktype"
import {
	packageScopes,
	packagesByScope,
	type ArkPackage,
	type PackageScope
} from "./shared.js"

const lastCommitBody = getShellOutput("git log -1 --pretty=%b").trim()

const publishConfigMatch = lastCommitBody.match(/```publish([\s\S]*)```/)?.[1]
if (!publishConfigMatch) process.exit(0)

const bumpType = type("===", "major", "minor", "patch", "prerelease")

const PublishConfig = type(
	flatMorph(packageScopes, (i, scope) => [`${scope}?` as const, bumpType])
).onUndeclaredKey("reject")

type PublishConfig = typeof PublishConfig.infer

const parsePublishConfig = type("parse.json").pipe(PublishConfig)

const publishConfig = parsePublishConfig.assert(publishConfigMatch)

let scope: PackageScope

const packagesToPublish: ArkPackage[] = []
const tagsToPublish: string[] = []

// apply bumped versions to package.json
for (scope in publishConfig) {
	const pkg = packagesByScope[scope]
	packagesToPublish.push(pkg)
	const bump = publishConfig[scope]

	let bumpCmd = `pnpm version ${bump}`

	if (bump === "prerelease") {
		const preid = pkg.version.match(/-(.*)\.\d*$/)?.[1]
		if (!preid) {
			throw new Error(
				`${scope} must have a prerelease version (was ${pkg.version})`
			)
		}
		bumpCmd += ` --preid ${preid}`
	}

	// get the new version without the leading "v", e.g. "v1.0.0" => "1.0.0"
	const nextVersion = getShellOutput(bumpCmd, { cwd: pkg.path }).slice(1)
	tagsToPublish.push(`${pkg.name}@${nextVersion}`)
}

packagesToPublish.forEach(pkg => {
	shell("pnpm publish", { cwd: pkg.path })
})

shell("git add .")
shell(
	`git commit -m "chore: bump versions" --author="ArkCI <noreply@arktype.io>"`
)

tagsToPublish.forEach(tagName => shell(`git tag ${tagName}`))

shell("git push --follow-tags")

tagsToPublish.forEach(tagName => shell(`gh release create ${tagName} --latest`))

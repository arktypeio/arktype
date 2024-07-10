import { shell } from "@arktype/fs"
import { flatMorph } from "@arktype/util"
import { type } from "arktype"
import {
	packageScopes,
	packagesByScope,
	type ArkPackage,
	type PackageScope
} from "./shared.js"

const lastCommitBody = shell("git log -1 --pretty=%b")

const publishConfigMatch = lastCommitBody.match(/```publish([\s\S]*)```/)
if (!publishConfigMatch?.[1]) process.exit(0)

const bumpType = type("===", "major", "minor", "patch", "prerelease")

const PublishConfig = type(
	flatMorph(packageScopes, (i, scope) => [`${scope}?` as const, bumpType])
).onUndeclaredKey("reject")

type PublishConfig = typeof PublishConfig.infer

const parsePublishConfig = type("parse.json").pipe(PublishConfig)

const publishConfig = parsePublishConfig.assert(publishConfigMatch)

let scope: PackageScope

const packagesToPublish: ArkPackage[] = []

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

	shell(bumpCmd, { cwd: pkg.path })
}

// packagesToPublish.forEach(pkg => shell("pnpm publish", { cwd: pkg.path }))

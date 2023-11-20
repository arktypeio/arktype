/** Changesets doesn't understand version suffixes like -alpha by default, so we use this to preserve them */
import {
	fromHere,
	readJson,
	readPackageJson,
	shell,
	writeJson
} from "@arktype/fs"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { docgen } from "./docgen/docgen.js"
import { repoDirs } from "./shared.js"

const currentSuffix = "beta"

const packageJsonPath = fromHere("..", "..", "package.json")

const packageJson = readJson(packageJsonPath)

// Temporarily remove the suffix, if it exists, so changesets can handle versioning
packageJson.version = packageJson.version.slice(0, -currentSuffix.length - 1)

writeJson(packageJsonPath, packageJson)

shell(`pnpm changes version`, { cwd: repoDirs.repo })

shell(`rm -f ${join(repoDirs.repo, ".changeset", "*.md")}`)

const nonSuffixedVersion = readPackageJson(repoDirs.root).version
const suffixedVersion = nonSuffixedVersion + `-${currentSuffix}`

packageJson.version = suffixedVersion
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4))

const changelogPath = fromHere("..", "..", "CHANGELOG.md")

writeFileSync(
	changelogPath,
	readFileSync(changelogPath)
		.toString()
		.replaceAll(nonSuffixedVersion, suffixedVersion)
)

docgen()

const existingDocsVersions: string[] = readJson(
	join(repoDirs.docs, `versions.json`)
)
if (!existingDocsVersions.includes(suffixedVersion)) {
	shell(
		`pnpm install && pnpm docusaurus docs:version ${suffixedVersion} && pnpm build`,
		{
			cwd: repoDirs.docs
		}
	)
	shell("pnpm format", { cwd: repoDirs.root })
}

shell(`git add ${repoDirs.root}`)

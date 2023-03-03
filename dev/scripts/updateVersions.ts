/** Changesets doesn't understand version suffixes like -alpha by default, so we use this to preserve them */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
    fromPackageRoot,
    readJson,
    readPackageJson,
    shell,
    writeJson
} from "../runtime/main.ts"
import { repoDirs } from "./common.ts"
import { docgen } from "./docgen/main.ts"

const currentSuffix = "alpha"

const packageJsonPath = fromPackageRoot("package.json")

const packageJson = readJson(packageJsonPath)

// Temporarily remove the suffix, if it exists, so changesets can handle versioning
packageJson.version = packageJson.version.slice(0, -currentSuffix.length - 1)

writeJson(packageJsonPath, packageJson)

shell(
    `node ${fromPackageRoot(
        "node_modules",
        "@changesets",
        "cli",
        "bin.js"
    )} version`,
    { cwd: repoDirs.configs }
)

shell(`rm -f ${join(repoDirs.configs, ".changeset", "*.md")}`)

const nonSuffixedVersion = readPackageJson(repoDirs.root).version
const suffixedVersion = nonSuffixedVersion + `-${currentSuffix}`

packageJson.version = suffixedVersion
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4))

const changelogPath = fromPackageRoot("CHANGELOG.md")

writeFileSync(
    changelogPath,
    readFileSync(changelogPath)
        .toString()
        .replaceAll(nonSuffixedVersion, suffixedVersion)
)

docgen()

const existingDocsVersions: string[] = readJson(
    join(repoDirs.arktypeIo, `versions.json`)
)
if (!existingDocsVersions.includes(suffixedVersion)) {
    shell(
        `pnpm install && pnpm docusaurus docs:version ${suffixedVersion} && pnpm build`,
        {
            cwd: repoDirs.arktypeIo
        }
    )
    shell("pnpm format", { cwd: repoDirs.root })
}

shell(`git add ${repoDirs.root}`)

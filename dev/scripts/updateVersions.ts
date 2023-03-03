/** Changesets doesn't understand version suffixes like -alpha by default, so we use this to preserve them */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
    fromPackageRoot,
    readFile,
    readJson,
    readPackageJson,
    shell,
    writeJson
} from "../runtime/main.ts"
import { repoDirs } from "./common.ts"
import { docgen } from "./docgen/main.ts"

const currentSuffix = "alpha"
const packageJsonPath = "package.json"

const packageJson = readJson(packageJsonPath)

// Temporarily remove the suffix, if it exists, so changesets can handle versioning
packageJson.version = packageJson.version.slice(0, -currentSuffix.length - 1)

writeJson(packageJsonPath, packageJson)

shell("pnpm changeset version")

const updatedVersion = readPackageJson(repoDirs.root).version
const updatedVersionWithSuffix = packageJson.version + `-${currentSuffix}`

packageJson.version = updatedVersionWithSuffix
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4))

// Move changelog updates, which by default are generated at the repo root, to
// the correct path.

const rootChangelogPath = fromPackageRoot("CHANGELOG.md")
const actualChangelogPath = join("dev", "configs", "CHANGELOG.md")
const changelog = readFile(actualChangelogPath)

if (existsSync(rootChangelogPath)) {
    const contents = readFileSync(rootChangelogPath)
        .toString()
        .replaceAll(packageJson.version, updatedVersionWithSuffix)
    // remove initial "#arktype" header
    const existingChanges = changelog.slice(10)
    writeFileSync(actualChangelogPath, contents + existingChanges)
    rmSync(rootChangelogPath)
}

docgen()

const existingDocsVersions: string[] = readJson(
    join(repoDirs.arktypeIo, `versions.json`)
)
if (!existingDocsVersions.includes(updatedVersion)) {
    shell(
        `pnpm install && pnpm docusaurus docs:version ${updatedVersion} && pnpm build`,
        {
            cwd: repoDirs.arktypeIo
        }
    )
    shell("pnpm format")
}

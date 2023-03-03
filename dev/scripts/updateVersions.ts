/** Changesets doesn't understand version suffixes like -alpha by default, so we use this to preserve them */
import { readFileSync, rmSync, writeFileSync } from "node:fs"
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
const packageJsonPath = "package.json"

const packageJson = readJson(packageJsonPath)

// Temporarily remove the suffix, if it exists, so changesets can handle versioning
packageJson.version = packageJson.version.slice(0, -currentSuffix.length - 1)

writeJson(packageJsonPath, packageJson)

shell("pnpm changeset version")

const updatedVersion = readPackageJson(repoDirs.root).version
const updatedVersionWithSuffix = updatedVersion + `-${currentSuffix}`

packageJson.version = updatedVersionWithSuffix
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4))

const rootChangelogPath = fromPackageRoot("CHANGELOG.md")

writeFileSync(
    rootChangelogPath,
    readFileSync(rootChangelogPath)
        .toString()
        .replaceAll(updatedVersion, updatedVersionWithSuffix)
)

// Move changelog updates, which by default are generated at the repo root, to
// the correct path.

const actualChangelogPath = join("dev", "configs", "CHANGELOG.md")

// remove duplicate "#arktype" header from existing changes
const existingChanges = readFileSync(actualChangelogPath).toString().slice(10)

writeFileSync(
    actualChangelogPath,
    readFileSync(rootChangelogPath).toString() + existingChanges
)

// Hack to work around the fact that changesets expects us to have a
// CHANGELOG.md file at the root. By git adding it first, we can delete it and
// git won't complain when changesets tries to add it, since it will be "adding"
// the change that we deleted it.
shell(`git add ${rootChangelogPath}`)
rmSync(rootChangelogPath)

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

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

shell("pnpm changeset version", { cwd: fromPackageRoot("dev", "configs") })

const updatedVersion = readPackageJson(repoDirs.root).version
const updatedVersionWithSuffix = updatedVersion + `-${currentSuffix}`

packageJson.version = updatedVersionWithSuffix
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4))

const changelogPath = fromPackageRoot("dev", "configs", "CHANGELOG.md")

writeFileSync(
    changelogPath,
    readFileSync(changelogPath)
        .toString()
        .replaceAll(updatedVersion, updatedVersionWithSuffix)
)

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

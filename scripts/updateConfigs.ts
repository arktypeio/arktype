import { copyFileSync } from "node:fs"
import { join } from "node:path"
import { readJson } from "../@arktype/node/src/index.js"
import { repoRoot } from "./common.js"
import { readFile, shell, writeFile, writeJson } from "@arktype/node"

console.log("Updating ./.vscode/autogeneratedPackageConfig...")

const repoVscodeDir = join(repoRoot, ".vscode")
const repoVscodeSettingsPath = join(repoVscodeDir, "settings.json")
const repoVscodeExtensionsPath = join(repoVscodeDir, "extensions.json")

// This dir is symlinked to by each individual package root
const packageVscodeDir = join(repoVscodeDir, "autogeneratedPackageConfig")
const packageVscodeSettingsPath = join(packageVscodeDir, "settings.json")
const packageVscodeExtensionsPath = join(packageVscodeDir, "extensions.json")

const autogeneratedMessageData = {
    "THIS FILE IS AUTOGENERATED":
        "Update '.vscode' in the repo root then run 'pnpm update-configs'."
}

writeJson(packageVscodeSettingsPath, {
    ...autogeneratedMessageData,
    ...readJson(repoVscodeSettingsPath),
    // Relative to package, TS lib will be in node_modules up two directories
    "typescript.tsdk": "../../node_modules/typescript/lib"
})

// Extensions file contains no paths so we just copy it
copyFileSync(repoVscodeExtensionsPath, packageVscodeExtensionsPath)

// console.log("Updating .prettierignore/.eslintignore...")
// const GITIGNORE_PATH = join(repoRoot, ".gitignore")
// // .eslintignore is symlinked to .prettierignore, so we don't need to do anything with it
// const PRETTIERIGNORE_PATH = join(repoRoot, ".prettierignore")

// const FORMAT_AUTOGEN_START =
//     "# THIS SECTION IS AUTOGENERATED FROM .gitignore via scripts/updateConfigs.ts"
// const FORMAT_AUTOGEN_END = "# END AUTOGENERATED"

// const gitIgnoreLines = readFile(GITIGNORE_PATH).split("\n")
// const prettierIgnoreLines = readFile(PRETTIERIGNORE_PATH).split("\n")
// const linesToPreserve = prettierIgnoreLines.slice(
//     prettierIgnoreLines.indexOf(FORMAT_AUTOGEN_END)
// )
// const linesToWrite = [
//     FORMAT_AUTOGEN_START,
//     ...gitIgnoreLines,
//     ...linesToPreserve
// ]

// writeFile(PRETTIERIGNORE_PATH, linesToWrite.join("\n"))

shell(`git add ${repoRoot}`)

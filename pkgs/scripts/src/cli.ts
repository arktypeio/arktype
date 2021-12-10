import { runScript, RunScriptOptions } from "@re-do/node"
import { readdirSync } from "fs"
import { promptForScriptsFile } from "./generateScripts.js"
import { getPackageJsonContents } from "./common.js"
import { join } from "path"

export const cli = async () => {
    const cwd = process.cwd()

    let scriptsFile = readdirSync(cwd).find(
        (fileName) => fileName === "scripts.js" || fileName === "scripts.ts"
    )
    if (!scriptsFile) {
        scriptsFile = await promptForScriptsFile()
    }
    const { type } = getPackageJsonContents()
    const esm = type === "module"

    const runArgIndex = process.argv.findIndex((arg) =>
        arg.endsWith(join("scripts", "cli.js"))
    )
    // If run was not found or was the last arg, quit
    if (runArgIndex === -1 || runArgIndex >= process.argv.length - 1) {
        throw new Error(
            "'run' requires a positional argument representing the name of the script to run, e.g. 'run build'."
        )
    }
    runScript(scriptsFile, {
        esm,
        processArgs: process.argv.slice(runArgIndex + 1)
    })
}

cli()

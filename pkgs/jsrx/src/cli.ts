import { shell, runScript } from "@re-do/node-utils"
import { readdirSync } from "fs"
import { promptForJsrxFile } from "./generateJsrx.js"
import { getPackageJsonContents } from "./common.js"

export const cli = async () => {
    const cwd = process.cwd()

    let jsrxConfigFile = readdirSync(cwd).find(
        (fileName) => fileName === "jsrx.js" || fileName === "jsrx.ts"
    )
    if (!jsrxConfigFile) {
        jsrxConfigFile = await promptForJsrxFile()
    }
    const { type } = getPackageJsonContents()
    const esm = type === "module"

    const jsrxArgIndex = process.argv.findIndex((arg) =>
        arg.endsWith("jsrx/cli.cjs")
    )
    // If 'jsrx' was not found or was the last arg, quit
    if (jsrxArgIndex === -1 || jsrxArgIndex >= process.argv.length - 1) {
        throw new Error(
            "'jsrx' requires a positional argument representing the name of the script to run, e.g. 'jsrx build'."
        )
    }
    runScript(jsrxConfigFile, {
        esm,
        processArgs: process.argv.slice(jsrxArgIndex + 1)
    })
}

cli()

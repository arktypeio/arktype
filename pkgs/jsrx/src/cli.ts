import { readdirSync } from "fs-extra"
import { shell } from "@re-do/node-utils"
import { promptForJsrxFile } from "./generateJsrx.js"

export const cli = async () => {
    const cwd = process.cwd()

    let jsrxConfigFile = readdirSync(cwd).find(
        (fileName) => fileName === "jsrx.js" || fileName === "jsrx.ts"
    )
    if (!jsrxConfigFile) {
        jsrxConfigFile = await promptForJsrxFile()
    }

    const runner =
        jsrxConfigFile === "jsrx.js" ? "node" : `node --loader ts-node/esm`

    const jsrxArgIndex = process.argv.findIndex((arg) =>
        arg.endsWith("jsrx/cli.js")
    )
    // If 'jsrx' was not found or was the last arg, quit
    if (jsrxArgIndex === -1 || jsrxArgIndex >= process.argv.length - 1) {
        throw new Error(
            "'jsrx' requires a positional argument representing the name of the script to run, e.g. 'jsrx build'."
        )
    }
    const scriptName = process.argv[jsrxArgIndex + 1]

    shell(`${runner} ${jsrxConfigFile} ${scriptName}`)
}

cli()

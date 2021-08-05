import { runScript } from "./shell.js"

const fileArgIndex = process.argv.findIndex((arg) =>
    arg.match(/.*^((?!runScript).)*.\.(js|cjs|mjs|ts)/)
)

if (fileArgIndex === -1) {
    throw new Error(
        "runScript requires a file with a .js, .cjs, .mjs, or .ts extension as an arg."
    )
}

runScript(process.argv[fileArgIndex], {
    esm: process.argv.includes("--esm"),
    processArgs: process.argv.slice(fileArgIndex + 1)
})

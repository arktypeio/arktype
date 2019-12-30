#!/usr/bin/env node
const { readdirSync } = require("fs-extra")
const { command } = require("execa")

const cwd = process.cwd()

const jsrxConfigFile = readdirSync(cwd).find(
    fileName => fileName === "jsrx.js" || fileName === "jsrx.ts"
)
if (!jsrxConfigFile) {
    throw new Error(`Found no 'jsrx.js' or 'jsrx.ts' file in ${process.cwd()}.`)
}
const runner = jsrxConfigFile === "jsrx.js" ? "node" : "npx ts-node"
command(
    `${runner} ${jsrxConfigFile} ${process.argv[process.argv.length - 1]}`,
    {
        cwd,
        stdio: "inherit"
    }
)

#!/usr/bin/env node
const { readdirSync } = require("fs-extra")
const { command } = require("@re-do/utils/dist/command")

const cwd = process.cwd()

const jsrxConfigFile = readdirSync(cwd).find(
    fileName => fileName === "jsrx.js" || fileName === "jsrx.ts"
)
if (!jsrxConfigFile) {
    throw new Error(`Found no 'jsrx.js' or 'jsrx.ts' file in ${cwd}.`)
}
const runner =
    jsrxConfigFile === "jsrx.js" ? "node" : "npx ts-node --transpile-only"
command(
    `${runner} ${jsrxConfigFile} ${process.argv[process.argv.length - 1]}`,
    {
        cwd,
        stdio: "inherit"
    }
)

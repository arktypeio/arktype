#!/usr/bin/env node
const { sync } = require("execa")
const { basename } = require("path")

const cwd = process.cwd()
const pkg = basename(cwd)

console.log(`redo-build🔨: Building ${pkg}...`)
console.log(`redo-build🔨: Transpiling ${pkg}...`)
sync("babel", [
    "src",
    "-d",
    "dist",
    "--extensions",
    ".ts,.tsx",
    "--ignore",
    "src/**/__tests__/*",
    "--source-maps",
    "inline",
    "--delete-dir-on-start"
])
console.log(`redo-build🔨: Compiling types for ${pkg}...`)
console.log(sync("tsc", ["--emitDeclarationOnly"]))
console.log(`redo-build🔨: Finished building ${pkg}.`)

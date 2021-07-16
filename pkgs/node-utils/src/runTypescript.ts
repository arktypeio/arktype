import { runTypescript } from "./shell.js"

runTypescript(process.argv[process.argv.length - 1], {
    commonjs: process.argv.includes("--commonjs")
})

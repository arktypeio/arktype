import { fromHere, fromPackageRoot } from "../attest/src/fs.js"
import { shell } from "../attest/src/shell.js"

const c8Runner = `node --require ${fromHere(
    "..",
    "configs",
    "patchC8.cjs"
)} ${fromPackageRoot("node_modules", "c8", "bin", "c8.js")}`
const baseTestCommand = `ts-node ${fromHere(
    "..",
    "attest",
    "src",
    "cli.ts"
)} --runner mocha`

const testCommand = process.argv.includes("--skipTypes")
    ? `${baseTestCommand} --skipTypes`
    : baseTestCommand
shell(`${c8Runner} ${testCommand}`)

import { fromHere } from "../attest/main.js"
import { shell } from "../attest/src/shell.js"
import { repoDirs } from "./common.js"

shell(
    `node ${fromHere(
        "..",
        "..",
        "node_modules",
        "@changesets",
        "cli",
        "bin.js"
    )} ${process.argv.slice(2).join(" ")}`,
    { cwd: repoDirs.configs }
)

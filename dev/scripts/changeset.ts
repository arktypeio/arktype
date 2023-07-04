import { fromHere } from "@arktype/attest"
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
    )} publish`,
    { cwd: repoDirs.configs }
)

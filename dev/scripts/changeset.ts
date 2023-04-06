import { fromPackageRoot } from "../runtime/fs.js"
import { shell } from "../runtime/shell.js"
import { repoDirs } from "./common.js"

shell(
    `node ${fromPackageRoot(
        "node_modules",
        "@changesets",
        "cli",
        "bin.js"
    )} ${process.argv.slice(2).join(" ")}`,
    { cwd: repoDirs.configs }
)

import { fromPackageRoot } from "../runtime/fs.ts"
import { shell } from "../runtime/shell.ts"
import { repoDirs } from "./common.ts"

shell(
    `node ${fromPackageRoot(
        "node_modules",
        "@changesets",
        "cli",
        "bin.js"
    )} ${process.argv.slice(2).join(" ")}`,
    { cwd: repoDirs.configs }
)

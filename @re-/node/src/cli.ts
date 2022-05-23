import { basename } from "path"
import { fileName } from "./fs.js"
import { reDoc } from "./reDoc/reDoc.js"
import { redoTsc } from "./reTsc.js"

const fileArgIndex = process.argv.findIndex((arg) =>
    basename(arg).match(/cli\.c?(j|t)s$/)
)

if (fileArgIndex === -1) {
    throw new Error(
        `Expected to find  'cli.cjs' in process args (got '${process.argv.join(
            " "
        )}').`
    )
}

const subcommand = process.argv[fileArgIndex + 1]

if (subcommand === "tsc") {
    redoTsc()
} else if (subcommand === "doc") {
    reDoc()
} else {
    throw new Error(`Unknown re subcommand '${subcommand}'.`)
}

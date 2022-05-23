import { fileName } from "./fs.js"
import { reDoc } from "./reDoc/reDoc.js"
import { redoTsc } from "./reTsc.js"

const fileArgIndex = process.argv.findIndex((arg) => arg === fileName())

if (fileArgIndex === -1) {
    throw new Error(
        `Expected to find ${fileName()} in process args (got '${process.argv.join(
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

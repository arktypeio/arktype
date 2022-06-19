/* eslint-disable import/no-unused-modules */
import { basename } from "node:path"
import { reDoc } from "./reDoc/reDoc.js"

const fileArgIndex = process.argv.findIndex((arg) =>
    basename(arg).match(/cli\.c?(j|t)s$/)
)

if (fileArgIndex === -1) {
    throw new Error(
        `Expected to find 'cli.cjs' in process args (got '${process.argv.join(
            " "
        )}').`
    )
}

reDoc()

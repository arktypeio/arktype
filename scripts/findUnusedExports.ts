import {
    findUnusedExports,
    logUnusedExportsToConsole
} from "./unusedExports.js"

const unusedExports = findUnusedExports()
logUnusedExportsToConsole(unusedExports)

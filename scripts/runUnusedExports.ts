import {
    findUnusedExports,
    logUnusedExportsToConsole
} from "./findUnusedExports.js"

const unusedExports = findUnusedExports()
logUnusedExportsToConsole(unusedExports)

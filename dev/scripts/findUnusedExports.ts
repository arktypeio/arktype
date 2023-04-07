import {
    findUnusedExports,
    logUnusedExportsToConsole
} from "./docgen/api/findUnusedExports.js"

const unusedExports = findUnusedExports()
logUnusedExportsToConsole(unusedExports)

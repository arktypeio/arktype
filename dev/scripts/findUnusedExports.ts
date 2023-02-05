import {
    findUnusedExports,
    logUnusedExportsToConsole
} from "./docgen/api/findUnusedExports.ts"

const unusedExports = findUnusedExports()
logUnusedExportsToConsole(unusedExports)

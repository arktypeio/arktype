import { getAttestConfig } from "../config.js"
import { getFileKey } from "../utils.js"
import { getVirtualTsMorphProject } from "./getTsMorphProject.js"
import type { AssertionData } from "./internal/main.js"
import {
    getAssertionsInFile,
    getCachedAssertionData,
    getDiagnosticsByFile
} from "./internal/main.ts"

type AnalyzeTypeAssertionsOptions = {
    isInitialCache?: boolean
}
export type AssertionsByFile = Record<string, AssertionData[]>

let __assertionCache: undefined | AssertionsByFile
export const getAssertionsByFile = ({
    isInitialCache
}: AnalyzeTypeAssertionsOptions = {}): AssertionsByFile => {
    if (__assertionCache) {
        return __assertionCache
    }
    const config = getAttestConfig()
    if (config.precached && !isInitialCache) {
        return getCachedAssertionData(config)
    }
    const project = getVirtualTsMorphProject()
    const diagnosticsByFile = getDiagnosticsByFile()
    const assertionsByFile: AssertionsByFile = {}
    for (const file of project.getSourceFiles()) {
        const assertionsInFile = getAssertionsInFile(file, diagnosticsByFile)
        if (assertionsInFile.length) {
            assertionsByFile[getFileKey(file.getFilePath())] = assertionsInFile
        }
    }
    __assertionCache = assertionsByFile
    return assertionsByFile
}

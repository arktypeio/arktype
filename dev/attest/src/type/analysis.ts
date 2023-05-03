import { getConfig } from "../config.js"
import { getFileKey } from "../utils.js"
import { getTsMorphProject } from "./cacheAssertions.js"
import type { AssertionData } from "./getAssertionsInFile.js"
import { getAssertionsInFile } from "./getAssertionsInFile.js"
import { getCachedAssertionData } from "./getCachedAssertionData.js"
import { getDiagnosticsByFile } from "./getDiagnosticsByFile.js"

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
    const config = getConfig()
    if (!isInitialCache) {
        return getCachedAssertionData(config)
    }
    const project = getTsMorphProject()
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

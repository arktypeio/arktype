import { getFileKey, getReAssertConfig } from "../common.js"
import { getDefaultTsMorphProject } from "./getTsMorphProject.js"
import type { AssertionData } from "./internal/index.js"
import {
    getAssertionsInFile,
    getCachedAssertionData,
    getDiagnosticsByFile
} from "./internal/index.js"

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
    const config = getReAssertConfig()
    if (config.precached && !isInitialCache) {
        return getCachedAssertionData(config)
    }
    const project = getDefaultTsMorphProject()
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

import { default as memoize } from "micro-memoize"
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

export const getAssertionsByFile = memoize(
    ({
        isInitialCache
    }: AnalyzeTypeAssertionsOptions = {}): AssertionsByFile => {
        const config = getReAssertConfig()
        if (config.precached && !isInitialCache) {
            return getCachedAssertionData(config)
        }
        const project = getDefaultTsMorphProject()
        const diagnosticsByFile = getDiagnosticsByFile()
        const assertionsByFile: AssertionsByFile = {}
        for (const file of project.getSourceFiles()) {
            const assertionsInFile = getAssertionsInFile(
                file,
                diagnosticsByFile
            )
            if (assertionsInFile.length) {
                assertionsByFile[getFileKey(file.getFilePath())] =
                    assertionsInFile
            }
        }
        return assertionsByFile
    }
)

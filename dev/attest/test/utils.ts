import { copyFileSync } from "node:fs"
import { readFile, runTs } from "../../attest/src/main.js"

export const runThenGetContents = (
    actualPath: string,
    templatePath: string
) => {
    copyFileSync(templatePath, actualPath)
    let testFileContents
    try {
        runTs(actualPath)
    } finally {
        testFileContents = readFile(actualPath)
        copyFileSync(templatePath, actualPath)
    }
    return testFileContents
}

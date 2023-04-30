import { copyFileSync } from "node:fs"
import { readFile, writeFile } from "../../attest/src/main.js"
import { writeCachedInlineSnapshotUpdates } from "../src/writeSnapshot.js"

export const runThenGetContents = async (
    testFileCopyPath: string,
    templatePath: string
) => {
    copyFileSync(templatePath, testFileCopyPath)
    let testFileContents
    try {
        await import(testFileCopyPath)
        writeCachedInlineSnapshotUpdates()
    } finally {
        testFileContents = readFile(testFileCopyPath)
        writeFile(testFileCopyPath, readFile(templatePath))
    }
    return testFileContents
}

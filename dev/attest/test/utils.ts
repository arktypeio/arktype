import { copyFileSync } from "node:fs"
import { readFile } from "../../attest/src/main.js"
import { writeCachedInlineSnapshotUpdates } from "../src/writeSnapshot.js"

export const runThenGetContents = async (
    actualPath: string,
    templatePath: string
) => {
    copyFileSync(templatePath, actualPath)
    let testFileContents
    try {
        await import(actualPath)
        writeCachedInlineSnapshotUpdates()
    } finally {
        testFileContents = readFile(actualPath)
        copyFileSync(templatePath, actualPath)
    }
    return testFileContents
}

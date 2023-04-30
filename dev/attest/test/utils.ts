import { copyFileSync } from "node:fs"
import { readFile, shell } from "../../attest/src/main.js"

export const runThenGetContents = async (
    actualPath: string,
    templatePath: string
) => {
    copyFileSync(templatePath, actualPath)
    let testFileContents
    try {
        shell(`pnpm -w ts ${actualPath}`)
    } finally {
        testFileContents = readFile(actualPath)
        copyFileSync(templatePath, actualPath)
    }
    return testFileContents
}

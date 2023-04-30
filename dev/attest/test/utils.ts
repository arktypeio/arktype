import { copyFileSync } from "node:fs"
import { readFile, shell } from "../../attest/src/main.js"

export const runThenGetContents = async (
    actualPath: string,
    templatePath: string
) => {
    copyFileSync(templatePath, actualPath)
    let testFileContents
    try {
        shell(`node --loader ts-node/esm ${actualPath}`)
    } finally {
        testFileContents = readFile(actualPath)
        copyFileSync(templatePath, actualPath)
    }
    return testFileContents
}

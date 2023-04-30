import { copyFileSync, rmSync } from "node:fs"
import { fromHere, readFile, shell } from "../../attest/src/main.js"

const PATH_TO_TEST_ASSERTIONS_DIR = fromHere(".attest")

export const runThenGetContents = (templatePath: string) => {
    const testFileCopyPath = templatePath + ".temp.ts"
    copyFileSync(templatePath, testFileCopyPath)
    let testFileContents
    try {
        shell(`node --loader ts-node/esm ${testFileCopyPath}`)
    } finally {
        testFileContents = readFile(testFileCopyPath)
        rmSync(testFileCopyPath)
    }
    return testFileContents
}

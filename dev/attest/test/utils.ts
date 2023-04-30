import { copyFileSync, rmSync } from "node:fs"
import { fromHere, readFile } from "../../attest/src/main.js"
import { configure, getConfig } from "../src/config.js"

const PATH_TO_TEST_ASSERTIONS_DIR = fromHere(".attest")

export const runThenGetContents = async (templatePath: string) => {
    const testFileCopyPath = templatePath + ".temp.ts"
    copyFileSync(templatePath, testFileCopyPath)
    let testFileContents
    try {
        const lastConfig = getConfig()
        configure({ cacheDir: PATH_TO_TEST_ASSERTIONS_DIR })
        await import(testFileCopyPath)
        configure(lastConfig)
    } finally {
        testFileContents = readFile(testFileCopyPath)
        rmSync(testFileCopyPath)
    }
    return testFileContents
}

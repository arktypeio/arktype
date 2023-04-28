import { copyFileSync, rmSync } from "node:fs"
import { fromHere, readFile, shell } from "../../attest/src/main.js"
import type { BenchFormat } from "../src/writeSnapshot.js"

const PATH_TO_TEST_ASSERTIONS_DIR = fromHere(".attest")

export type RunThenGetContentsOptions = {
    includeBenches?: boolean
    benchFormat?: BenchFormat
}

export const runThenGetContents = (
    templatePath: string,
    { includeBenches, benchFormat }: RunThenGetContentsOptions = {}
) => {
    const testFileCopyPath = templatePath + ".temp.ts"
    let ARKTYPE_CHECK_CMD = includeBenches ? " --bench" : ""
    if (benchFormat?.noExternal) {
        ARKTYPE_CHECK_CMD += " --no-external"
    }
    if (benchFormat?.noInline) {
        ARKTYPE_CHECK_CMD += " --no-inline"
    }
    copyFileSync(templatePath, testFileCopyPath)
    let testFileContents
    try {
        ARKTYPE_CHECK_CMD += `--cacheDir ${PATH_TO_TEST_ASSERTIONS_DIR}`
        shell(`npx ts-node ${testFileCopyPath}`, {
            env: {
                ARKTYPE_CHECK_CMD,
                NODE_OPTIONS: "--loader=ts-node/esm"
            }
        })
    } finally {
        testFileContents = readFile(testFileCopyPath)
        rmSync(testFileCopyPath)
    }
    return testFileContents
}

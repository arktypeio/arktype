import { copyFileSync, rmSync } from "node:fs"
import { fromHere, readFile, shell } from "../../runtime/main.ts"
import type { BenchFormat } from "../src/writeSnapshot.ts"

const PATH_TO_TEST_ASSERTIONS_DIR = fromHere(".attest")

export type RunThenGetContentsOptions = {
    precache?: boolean
    includeBenches?: boolean
    benchFormat?: BenchFormat
}

export const runThenGetContents = (
    templatePath: string,
    { precache, includeBenches, benchFormat }: RunThenGetContentsOptions = {}
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
        if (precache) {
            ARKTYPE_CHECK_CMD += ` --precache --cacheDir ${PATH_TO_TEST_ASSERTIONS_DIR}`
            shell(`npx ts-node ${testFileCopyPath} --attestTestPreCached`, {
                env: {
                    ARKTYPE_CHECK_CMD
                }
            })
        } else {
            shell(`npx ts-node ${testFileCopyPath}`, {
                env: { ARKTYPE_CHECK_CMD }
            })
        }
    } finally {
        testFileContents = readFile(testFileCopyPath)
        rmSync(testFileCopyPath)
    }
    return testFileContents
}

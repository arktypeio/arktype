import { copyFileSync, rmSync } from "node:fs"
import { fromHere, readFile, shell } from "@arktype/node"
import type { BenchFormat } from "../writeSnapshot.js"

const PATH_TO_TEST_ASSERTIONS_DIR = fromHere(".reassert")

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
    let RE_ASSERT_CMD = includeBenches ? " --bench" : ""
    if (benchFormat?.noExternal) {
        RE_ASSERT_CMD += " --no-external"
    }
    if (benchFormat?.noInline) {
        RE_ASSERT_CMD += " --no-inline"
    }
    copyFileSync(templatePath, testFileCopyPath)
    let testFileContents
    try {
        if (precache) {
            RE_ASSERT_CMD += ` --precache --cacheDir ${PATH_TO_TEST_ASSERTIONS_DIR}`
            shell(`npx ts-node ${testFileCopyPath} --reassertTestPreCached`, {
                env: {
                    RE_ASSERT_CMD
                }
            })
        } else {
            shell(`npx ts-node ${testFileCopyPath}`, {
                env: { RE_ASSERT_CMD }
            })
        }
    } finally {
        testFileContents = readFile(testFileCopyPath)
        rmSync(testFileCopyPath)
    }
    return testFileContents
}

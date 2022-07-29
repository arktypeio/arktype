import { copyFileSync, rmSync } from "node:fs"
import { fromHere, readFile, shell } from "@re-/node"

const PATH_TO_TEST_ASSERTIONS_DIR = fromHere(".reassert")

export type RunThenGetContentsOptions = {
    precache?: boolean
    includeBenches?: boolean
}

export const runThenGetContents = (
    templatePath: string,
    { precache, includeBenches }: RunThenGetContentsOptions = {}
) => {
    const testFileCopyPath = templatePath + ".temp.ts"
    let RE_ASSERT_CMD = includeBenches ? "--bench" : ""
    copyFileSync(templatePath, testFileCopyPath)
    let testFileContents
    try {
        if (precache) {
            RE_ASSERT_CMD += ` --precache --cacheDir ${PATH_TO_TEST_ASSERTIONS_DIR}`
            shell(
                `npx --no ts-node ${testFileCopyPath} --reassertTestPreCached`,
                {
                    env: {
                        RE_ASSERT_CMD
                    }
                }
            )
        } else {
            shell(`npx --no ts-node ${testFileCopyPath}`, {
                env: { RE_ASSERT_CMD }
            })
        }
    } finally {
        testFileContents = readFile(testFileCopyPath)
        rmSync(testFileCopyPath)
    }
    return testFileContents
}

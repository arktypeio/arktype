import { copyFileSync, rmSync } from "node:fs"
import { fromHere, readFile, shell } from "@re-/node"

const PATH_TO_TEST_ASSERTIONS_DIR = fromHere(".reassert")

export const runThenGetContents = (templatePath: string, precache: boolean) => {
    const testFileCopyPath = templatePath + ".temp.ts"
    copyFileSync(templatePath, testFileCopyPath)
    let testFileContents
    try {
        if (precache) {
            shell(
                `npx --no ts-node ${testFileCopyPath} --reassertTestPreCached`,
                {
                    env: {
                        RE_ASSERT_CMD: `--precache --cacheDir ${PATH_TO_TEST_ASSERTIONS_DIR}`
                    }
                }
            )
        } else {
            shell(`npx --no ts-node ${testFileCopyPath}`, {
                env: { RE_ASSERT_CMD: undefined }
            })
        }
    } finally {
        testFileContents = readFile(testFileCopyPath)
        rmSync(testFileCopyPath)
    }
    return testFileContents
}

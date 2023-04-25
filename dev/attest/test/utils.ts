import { copyFileSync, rmSync } from "node:fs"
import { fromHere, readFile, shell } from "../../attest/src/runtime/main.js"
import type { BenchFormat } from "../src/writeSnapshot.js"

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

    copyFileSync(templatePath, testFileCopyPath)
    let testFileContents
    // pnpm ts-node ./dev/attest/src/cli.ts -b --file ./dev/attest/test/benchTemplate.ts
    try {
        shell(
            `npx ts-node ./dev/attest/src/cli.ts -b --file ./dev/attest/test/benchTemplate.ts --cacheDir ${PATH_TO_TEST_ASSERTIONS_DIR}`
        )
    } finally {
        testFileContents = readFile(testFileCopyPath)
        rmSync(testFileCopyPath)
    }
    return testFileContents
}

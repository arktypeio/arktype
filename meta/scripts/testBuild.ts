import { join } from "node:path"
import { getPackageDataFromCwd } from "../common.js"
import { shell } from "../node/index.js"

export const testBuild = (outDir: string) =>
    shell(
        `pnpm reassert --skipTypes --cmd mocha ${join(
            outDir,
            "**",
            "*.test.*"
        )}`
    )

const packageData = getPackageDataFromCwd()
testBuild(packageData.mjsOut)
testBuild(packageData.cjsOut)

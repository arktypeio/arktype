import { join } from "node:path"
import { getPackageDataFromCwd } from "../common.js"
import { shell } from "#runtime"

export const testBuild = (outDir: string) =>
    shell(
        `pnpm attest --skipTypes --cmd mocha ${join(outDir, "**", "*.test.*")}`
    )

const packageData = getPackageDataFromCwd()
testBuild(packageData.mjsOut)
testBuild(packageData.cjsOut)

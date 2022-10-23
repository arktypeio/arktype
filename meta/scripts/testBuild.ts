import { join } from "node:path"
import { shell } from "../../@arktype/node/api.js"
import { getPackageDataFromCwd } from "../common.js"

export const testBuild = (outDir: string) =>
    shell(
        `pnpm attest --skipTypes --cmd mocha ${join(outDir, "**", "*.test.*")}`
    )

const packageData = getPackageDataFromCwd()
testBuild(packageData.mjsOut)
testBuild(packageData.cjsOut)

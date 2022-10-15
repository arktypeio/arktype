import { join } from "node:path"
import { shell } from "../@arktype/node/src/index.js"
import { cjsOut, mjsOut } from "./common.js"

export const testBuild = (outDir: string) =>
    shell(
        `pnpm reassert --skipTypes --cmd mocha ${join(
            outDir,
            "**",
            "*.test.*"
        )}`
    )

testBuild(mjsOut)
testBuild(cjsOut)

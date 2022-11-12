import { join } from "node:path"
import { shell } from "../runtime/exports.js"
import { cjsOut, mjsOut } from "./common.js"

export const testBuild = (outDir: string) =>
    shell(
        `pnpm ts-node ./dev/attest/cli.ts --skipTypes --cmd mocha ${join(
            outDir,
            "**",
            "*.test.*"
        )}`
    )

shell("pnpm test")
testBuild(mjsOut)
testBuild(cjsOut)

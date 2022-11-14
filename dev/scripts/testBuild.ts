import { join } from "node:path"
import { shell } from "../runtime/exports.js"
import { repoDirs } from "./common.js"

export const testBuild = (outDir: string) =>
    shell(
        `pnpm ts-node ./dev/attest/cli.ts --skipTypes --cmd mocha ${join(
            outDir,
            "**",
            "*.test.*"
        )}`
    )

testBuild(repoDirs.mjsOut)
testBuild(repoDirs.cjsOut)

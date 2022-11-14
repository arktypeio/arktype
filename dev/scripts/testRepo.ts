import { join } from "node:path"
import { shell } from "../runtime/exports.js"
import { cjsOut, mjsOut, repoDirs } from "./common.js"

export const testBuild = (outDir: string) =>
    shell(
        `pnpm ts-node ./dev/attest/cli.ts --skipTypes --cmd mocha ${join(
            outDir,
            "**",
            "*.test.*"
        )}`
    )

shell("pnpx ts-node cli.ts --cmd mocha", { cwd: join(repoDirs.dev, "attest") })
testBuild(mjsOut)
testBuild(cjsOut)

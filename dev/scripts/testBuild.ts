import { copyFileSync } from "node:fs"
import { shell } from "../attest/src/runtime/shell.js"
import { repoDirs } from "./common.js"

export const testBuild = (outDir: string) => {
    shell(`attest --skipTypes --runner mocha`, {
        cwd: outDir
    })
}
shell("pnpm buildAttest")
shell("pnpm build --test")
testBuild(repoDirs.mjsOut)
testBuild(repoDirs.cjsOut)
shell("pnpm build")
copyFileSync

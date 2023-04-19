import { shell } from "../attest/src/runtime/shell.js"
import { repoDirs } from "./common.js"

export const testBuild = (outDir: string) => {
    shell(`node ./dev/attest/src/cli.js --skipTypes --cmd mocha`, {
        cwd: outDir
    })
}
shell("pnpm build --test")
testBuild(repoDirs.mjsOut)
testBuild(repoDirs.cjsOut)
shell("pnpm build")

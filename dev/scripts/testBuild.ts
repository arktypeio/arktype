import { fromHere, shell } from "../attest/src/main.js"
import { repoDirs } from "./common.js"

const testBuild = (outDir: string) => {
    shell(`node --loader ts-node/esm ${fromHere("test.ts")} --skipTypes`, {
        cwd: outDir
    })
}

shell("pnpm build", {
    cwd: fromHere("..", "attest")
})
shell("pnpm build --test")
testBuild(repoDirs.mjsOut)
testBuild(repoDirs.cjsOut)
shell("pnpm build")

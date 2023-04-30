import { fromHere, shell } from "../attest/src/main.js"
import { repoDirs } from "./common.js"

const ts = "node --loader=ts-node/esm --no-warnings=ExperimentalWarning"

const testBuild = (outDir: string) => {
    shell(`${ts} ${fromHere("test.ts")}`, {
        cwd: outDir,
        env: {
            ATTEST_CONFIG: JSON.stringify({ skipTypes: true })
        }
    })
}

shell("pnpm build", {
    cwd: fromHere("..", "attest")
})
shell("pnpm build --test")
testBuild(repoDirs.mjsOut)
testBuild(repoDirs.cjsOut)
shell("pnpm build")

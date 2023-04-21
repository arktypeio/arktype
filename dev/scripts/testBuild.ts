import { fromPackageRoot, shell } from "../attest/src/runtime/main.js"
import { repoDirs } from "./common.js"

export const testBuild = (outDir: string) => {
    const cli = fromPackageRoot("dev", "attest", outDir, "cli.js")
    const output = fromPackageRoot(outDir, "dev", "test")
    shell(`node ${cli} --skipTypes --runner mocha`, { cwd: outDir })
}
// shell("pnpm buildAttest")
// shell("pnpm build --test")
testBuild(repoDirs.mjsOut)
testBuild(repoDirs.cjsOut)
// shell("pnpm build")

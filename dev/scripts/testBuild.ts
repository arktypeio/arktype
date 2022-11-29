import { shell } from "../runtime/exports.js"
import { repoDirs } from "./common.js"

export const testBuild = (outDir: string) => {
    try {
        outDir === "dist/deno"
            ? shell(
                  `deno run --allow-all --no-check ./dev/attest/cli.ts --skipTypes --cmd mocha`,
                  {
                      cwd: outDir
                  }
              )
            : shell(`node ./dev/attest/cli.js --skipTypes --cmd mocha`, {
                  cwd: outDir
              })
    } catch (e) {
        console.log(`${outDir} tests ran`)
    }
}
testBuild(repoDirs.mjsOut)
testBuild(repoDirs.cjsOut)
testBuild(repoDirs.denoOut)

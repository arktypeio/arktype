import { shell } from "../runtime/api.ts"
import { repoDirs } from "./common.ts"

export const testBuild = (outDir: string) => {
    outDir === repoDirs.denoOut
        ? shell(
              `deno run --allow-all --no-check ./dev/attest/cli.ts --skipTypes --cmd mocha`,
              {
                  cwd: outDir
              }
          )
        : shell(`node ./dev/attest/cli.js --skipTypes --cmd mocha`, {
              cwd: outDir
          })
}
testBuild(repoDirs.mjsOut)
testBuild(repoDirs.cjsOut)
testBuild(repoDirs.denoOut)

import { shell } from "@re-/node"
import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { join, dirname } from "node:path"
import { cacheTypeAssertions, cleanupTypeAssertionCache } from "./index.js"

export const wrapRunner = () => {
    const cliArgIndex = process.argv.findIndex((_) =>
        _.match(/.*reAssert\.(c|m)?(j|t)s$/)
    )
    if (cliArgIndex === -1) {
        throw new Error(
            `Unable to parse @re-/assert CLI args '${process.argv.join(" ")}'.`
        )
    }
    const runner = process.argv[cliArgIndex + 1]
    if (runner !== "jest" && runner !== "mocha") {
        throw new Error(
            `A runner must be specified (either "reAssert mocha <mocha opts?>" or "reAssert jest <jest opts?>").`
        )
    }
    let runnerMainPath: string
    try {
        try {
            runnerMainPath = require.resolve(runner)
        } catch {
            runnerMainPath = createRequire(import.meta.url).resolve(runner)
        }
    } catch (e) {
        throw new Error(
            `To use @re-/assert's ${runner} runner, ${runner} must be resolvable in your environment.`,
            {
                cause: e instanceof Error ? e : undefined
            }
        )
    }
    const runnerBinPath = join(
        dirname(runnerMainPath),
        ...(runner === "jest" ? ["..", "bin", "jest.js"] : ["bin", "mocha.js"])
    )
    if (!existsSync(runnerBinPath)) {
        throw new Error(
            `Resolved ${runner} to '${runnerMainPath}' but was unable to find ` +
                `an executable at the expected location ('${runnerBinPath}').`
        )
    }

    cacheTypeAssertions()
    shell(`${runnerBinPath} ${process.argv.slice(cliArgIndex + 2).join(" ")}`)
    cleanupTypeAssertionCache()
}

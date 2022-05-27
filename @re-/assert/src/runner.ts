#!/usr/bin/env node
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { version, versions } from "node:process"
import { fileName, requireResolve, shell } from "@re-/node"
import { cacheAssertions, cleanupAssertions } from "./type/index.js"

let runTestsCmd = ""
const runnerArgIndex = process.argv.findIndex((arg) =>
    /.*runner\.c?(j|t)s$/.test(arg)
)
if (runnerArgIndex === -1) {
    throw new Error(
        `Unable to parse @re-/assert CLI args '${process.argv.join(
            " "
        )}' (expected to find a reference to ${fileName()}).`
    )
}
const runner = process.argv[runnerArgIndex + 1]
if (runner !== "jest" && runner !== "mocha" && runner !== "node") {
    throw new Error(
        `A runner must be specified via "reAssert <runner> <opts?>"` +
            `where runner is either jest, mocha, or node.`
    )
}
if (runner === "node") {
    const nodeMajorVersion = Number.parseInt(versions.node.split(".")[0])
    if (nodeMajorVersion < 18) {
        throw new Error(
            `Node's test runner requires at least version 18. You are running ${version}.`
        )
    }
    runTestsCmd += "node --loader ts-node/esm --test "
} else {
    let runnerIndexPath: string
    try {
        runnerIndexPath = requireResolve(runner)
    } catch (error) {
        throw new Error(
            `To use @re-/assert's ${runner} runner, ${runner} must be resolvable in your environment.`,
            {
                cause: error instanceof Error ? error : undefined
            }
        )
    }
    const runnerBinPath = join(
        dirname(runnerIndexPath),
        ...(runner === "jest" ? ["..", "bin", "jest.js"] : ["bin", "mocha.js"])
    )
    if (!existsSync(runnerBinPath)) {
        throw new Error(
            `Resolved ${runner} to '${runnerIndexPath}' but was unable to find ` +
                `an executable at the expected location ('${runnerBinPath}').`
        )
    }
    runTestsCmd += runnerBinPath + " "
}

const runnerArgs = process.argv.slice(runnerArgIndex + 2).join(" ")

runTestsCmd += runnerArgs

let exitCode: number | undefined

try {
    console.log(`⏳ @re-/assert: Analyzing type assertions...`)
    const cacheStart = Date.now()
    cacheAssertions({ forcePrecache: true })
    const cacheSeconds = (Date.now() - cacheStart) / 1000
    console.log(
        `✅ @re-/assert: Finished caching type assertions in ${cacheSeconds} seconds.\n`
    )
    console.log(`⏳ @re-/assert: Using ${runner} to run your tests...`)
    const runnerStart = Date.now()
    exitCode = shell(runTestsCmd, {
        env: { RE_ASSERT_CMD: runTestsCmd },
        reject: false
    }).exitCode
    const runnerSeconds = (Date.now() - runnerStart) / 1000
    console.log(
        `✅ @re-/assert: ${runner} completed in ${runnerSeconds} seconds.\n`
    )
} finally {
    console.log(
        `⏳ @re-/assert: Updating inline snapshots and cleaning up cache...`
    )
    const cleanupStart = Date.now()
    cleanupAssertions()
    const cleanupSeconds = (Date.now() - cleanupStart) / 1000
    console.log(
        `✅ @re-/assert: Finished cleanup in ${cleanupSeconds} seconds.`
    )
    if (exitCode) {
        process.exit(exitCode)
    }
}

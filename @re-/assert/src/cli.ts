#!/usr/bin/env node
import { basename, join } from "node:path"
import { version, versions } from "node:process"
import { fileName, findPackageRoot, shell, walkPaths } from "@re-/node"
import { cacheAssertions, cleanupAssertions } from "./type/index.js"

let runTestsCmd = ""
const reassertArgIndex = process.argv.findIndex((arg) =>
    /.*cli\.c?(j|t)s$/.test(arg)
)
if (reassertArgIndex === -1) {
    throw new Error(
        `Unable to parse @re-/assert CLI args '${process.argv.join(
            " "
        )}' (expected to find a reference to ${fileName()}).`
    )
}

if (process.argv[reassertArgIndex + 1] === "bench") {
    const packageRoot = findPackageRoot(process.cwd())
    const benchFilePaths = walkPaths(join(packageRoot, "src"), {
        include: (path) => basename(path).includes(".bench.")
    })
    let exitCode = 0
    for (const path of benchFilePaths) {
        try {
            shell(`npx --no ts-node ${path}`, {
                env: {
                    RE_ASSERT_CMD: process.argv
                        .slice(reassertArgIndex + 1)
                        .join(" ")
                }
            })
        } catch {
            exitCode = 1
        }
    }
    process.exit(exitCode)
}

const cmdFlagIndex = process.argv.indexOf("--cmd")
if (cmdFlagIndex === -1 || cmdFlagIndex === process.argv.length - 1) {
    throw new Error(`Must provide a runner command, e.g. 'reassert --cmd jest'`)
}

const testCmd = process.argv.slice(cmdFlagIndex + 1).join(" ")

if (testCmd === "node") {
    const nodeMajorVersion = Number.parseInt(versions.node.split(".")[0])
    if (nodeMajorVersion < 18) {
        throw new Error(
            `Node's test runner requires at least version 18. You are running ${version}.`
        )
    }
    runTestsCmd += `node --loader ts-node/esm --test `
} else {
    runTestsCmd += `npx --no ${testCmd} `
}

const reassertArgs = [...process.argv.slice(0, cmdFlagIndex), "--precache"]

const skipTypes = reassertArgs.includes("--skipTypes")

let processError: unknown

try {
    if (skipTypes) {
        console.log(
            "✅ Skipping type assertions because --skipTypes was passed."
        )
    } else {
        console.log(`⏳ @re-/assert: Analyzing type assertions...`)
        const cacheStart = Date.now()
        cacheAssertions({ forcePrecache: true })
        const cacheSeconds = (Date.now() - cacheStart) / 1000
        console.log(
            `✅ @re-/assert: Finished caching type assertions in ${cacheSeconds} seconds.\n`
        )
    }
    console.log(`⏳ @re-/assert: Using ${testCmd} to run your tests...`)
    const runnerStart = Date.now()
    shell(runTestsCmd, {
        stdio: "inherit",
        env: { RE_ASSERT_CMD: reassertArgs.join(" ") }
    })
    const runnerSeconds = (Date.now() - runnerStart) / 1000
    console.log(
        `✅ @re-/assert: ${testCmd} completed in ${runnerSeconds} seconds.\n`
    )
} catch (error) {
    processError = error
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
}
if (processError) {
    throw processError
}

#!/usr/bin/env node
import { basename, join } from "node:path"
import { version, versions } from "node:process"
import { fileName, findPackageRoot, shell, walkPaths } from "#runtime"
import { cacheAssertions, cleanupAssertions } from "./type/index.js"

let runTestsCmd = ""
const attestArgIndex = process.argv.findIndex((arg) =>
    /.*cli\.c?(j|t)s$/.test(arg)
)
if (attestArgIndex === -1) {
    throw new Error(
        `Unable to parse @arktype/check CLI args '${process.argv.join(
            " "
        )}' (expected to find a reference to ${fileName()}).`
    )
}

if (process.argv[attestArgIndex + 1] === "bench") {
    const packageRoot = findPackageRoot(process.cwd())
    const benchFilePaths = walkPaths(join(packageRoot, "src"), {
        include: (path) => basename(path).includes(".bench.")
    })
    let exitCode = 0
    for (const path of benchFilePaths) {
        try {
            shell(`npx ts-node ${path}`, {
                env: {
                    ARKTYPE_CHECK_CMD: process.argv
                        .slice(attestArgIndex + 1)
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
    throw new Error(`Must provide a runner command, e.g. 'attest --cmd jest'`)
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
    runTestsCmd += `npx ${testCmd} `
}

const attestArgs = [...process.argv.slice(0, cmdFlagIndex), "--precache"]

const skipTypes = attestArgs.includes("--skipTypes")

let processError: unknown

try {
    if (skipTypes) {
        console.log(
            "✅ Skipping type assertions because --skipTypes was passed."
        )
    } else {
        console.log(`⏳ @arktype/check: Analyzing type assertions...`)
        const cacheStart = Date.now()
        cacheAssertions({ forcePrecache: true })
        const cacheSeconds = (Date.now() - cacheStart) / 1000
        console.log(
            `✅ @arktype/check: Finished caching type assertions in ${cacheSeconds} seconds.\n`
        )
    }
    console.log(`⏳ @arktype/check: Using ${testCmd} to run your tests...`)
    const runnerStart = Date.now()
    shell(runTestsCmd, {
        stdio: "inherit",
        env: { ARKTYPE_CHECK_CMD: attestArgs.join(" ") }
    })
    const runnerSeconds = (Date.now() - runnerStart) / 1000
    console.log(
        `✅ @arktype/check: ${testCmd} completed in ${runnerSeconds} seconds.\n`
    )
} catch (error) {
    processError = error
} finally {
    console.log(
        `⏳ @arktype/check: Updating inline snapshots and cleaning up cache...`
    )
    const cleanupStart = Date.now()
    cleanupAssertions()
    const cleanupSeconds = (Date.now() - cleanupStart) / 1000
    console.log(
        `✅ @arktype/check: Finished cleanup in ${cleanupSeconds} seconds.`
    )
}
if (processError) {
    throw processError
}

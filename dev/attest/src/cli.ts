#!/usr/bin/env node
import { basename } from "node:path"
import { fromCwd, fromHere, shell, walkPaths } from "./runtime/main.ts"
import { cacheAssertions, cleanupAssertions } from "./main.ts"
import { versions } from "node:process"
import { version } from "node:os"

const args: string[] =
    (globalThis as any).process?.argv ?? (globalThis as any).Deno.args

let attestArgIndex = args.findIndex((arg) => /.*cli\.c?(j|t)s$/.test(arg))
attestArgIndex = attestArgIndex === -1 ? 0 : attestArgIndex
if (attestArgIndex === -1) {
    attestArgIndex = 0
}
if (args[attestArgIndex + 1] === "bench") {
    const now = Date.now()
    console.log("started search")
    const benchFilePaths = walkPaths(fromCwd(), {
        include: (path) => basename(path).includes(".bench.")
    })
    console.log(`finished search ${Date.now() - now}`)

    let threwDuringBench
    for (const path of benchFilePaths) {
        try {
            shell(`npx ts-node ${path}`, {
                env: {
                    ARKTYPE_CHECK_CMD: args.slice(attestArgIndex + 1).join(" ")
                }
            })
        } catch {
            threwDuringBench = true
        }
    }
    if (threwDuringBench) {
        throw new Error()
    }
} else {
    const attestArgs = [...args, "--precache"]

    const skipTypes = attestArgs.includes("--skipTypes")

    const cmdFlagIndex = process.argv.indexOf("--cmd")
    if (cmdFlagIndex === -1 || cmdFlagIndex === process.argv.length - 1) {
        throw new Error(
            `Must provide a runner command, e.g. 'attest --cmd mocha'`
        )
    }
    const testCmd = process.argv.slice(cmdFlagIndex + 1).join(" ")
    let prefix = ""

    if (testCmd === "node") {
        const nodeMajorVersion = Number.parseInt(versions.node.split(".")[0])
        if (nodeMajorVersion < 18) {
            throw new Error(
                `Node's test runner requires at least version 18. You are running ${version}.`
            )
        }
        prefix += `node --loader ts-node/esm --test `
    } else {
        prefix += `npx ${testCmd} `
    }
    let processError: unknown
    const isBuildTest = args[attestArgIndex].includes("dist")

    try {
        if (skipTypes) {
            console.log(
                "✅ Skipping type assertions because --skipTypes was passed."
            )
        } else {
            console.log(`⏳ attest: Analyzing type assertions...`)
            const cacheStart = Date.now()
            cacheAssertions({ forcePrecache: true })
            const cacheSeconds = (Date.now() - cacheStart) / 1000
            console.log(
                `✅ attest: Finished caching type assertions in ${cacheSeconds} seconds.\n`
            )
        }

        const runnerStart = Date.now()

        shell(`${prefix} ${isBuildTest ? "**/test/*.test.js" : ""}`, {
            stdio: "inherit",
            env: { ARKTYPE_CHECK_CMD: attestArgs.join(" ") }
        })
        const runnerSeconds = (Date.now() - runnerStart) / 1000
        console.log(
            `✅ attest: npx mocha completed in ${runnerSeconds} seconds.\n`
        )
    } catch (error) {
        processError = error
    } finally {
        console.log(
            `⏳ attest: Updating inline snapshots and cleaning up cache...`
        )
        const cleanupStart = Date.now()
        cleanupAssertions()
        const cleanupSeconds = (Date.now() - cleanupStart) / 1000
        console.log(`✅ attest: Finished cleanup in ${cleanupSeconds} seconds.`)
    }
    if (processError) {
        throw processError
    }
}

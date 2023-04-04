#!/usr/bin/env node
import { basename } from "node:path"
import {
    findPackageRoot,
    fromHere,
    fromPackageRoot,
    shell,
    walkPaths
} from "./runtime/main.ts"
import { cacheAssertions, cleanupAssertions } from "./main.ts"

const args: string[] =
    (globalThis as any).process?.argv ?? (globalThis as any).Deno.args

let attestArgIndex = args.findIndex((arg) => /.*cli\.c?(j|t)s$/.test(arg))
attestArgIndex = attestArgIndex === -1 ? 0 : attestArgIndex
if (attestArgIndex === -1) {
    attestArgIndex = 0
}

if (args[attestArgIndex + 1] === "bench") {
    const packageRoot = findPackageRoot()
    const benchFilePaths = walkPaths(packageRoot, {
        ignoreDirsMatching: /node_modules|dist/,
        include: (path) => basename(path).includes(".bench.")
    })
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
        console.log(`⏳ attest: Using npx mocha to run your tests...`)
        const runnerStart = Date.now()

        const prefix = attestArgs.includes("--coverage")
            ? `node --require ${fromHere("patchC8.cjs")} ${fromPackageRoot(
                  "node_modules",
                  "c8",
                  "bin",
                  "c8.js"
              )} mocha`
            : "npx mocha"

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

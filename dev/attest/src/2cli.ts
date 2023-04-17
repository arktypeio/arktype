#!/usr/bin/env node
import { readFileSync } from "node:fs"
import { version } from "node:os"
import { basename } from "node:path"
import { versions } from "node:process"
import { Command } from "commander"
import { cacheAssertions, cleanupAssertions } from "./main.js"
import { fromCwd, shell, walkPaths } from "./runtime/main.js"

const attest = new Command()
const packageVersion = "0.0.0"
const description = "ArkType Testing"

attest
    .version(packageVersion)
    .description(description)
    .option("-r, --runner  <value>", "Run using a specified test runner")
    .option("-s, --skipTypes", "Skip type assertions")
    .option(
        "-f, --files <value>",
        "Specify the location of the tests you would like to run (maybe)."
    )
    .option("-h, --help, View details about the cli")
    .option("-b, --bench, Runs benchmarks found in *.bench.ts files")
    .option(
        "-p --benchmarksPath <path>, defines where to save bench results (json)"
    )
    .option(
        "--filter <filter>, runs benches based on a filter (/options.bench.ts || nameOfBench?)"
    )
    .parse(process.argv)

const options = attest.opts()
const processArgs = process.argv
const passedArgs = processArgs.slice(2)

if (!passedArgs.length || options.help) {
    attest.outputHelp()
    process.exit(0)
}
if (options.bench) {
    const benchFilePaths = walkPaths(fromCwd(), {
        include: (path) => basename(path).includes(".bench.")
    })
    let threwDuringBench
    let filteredPaths = benchFilePaths

    if (options.filter) {
        const filterParam = options.filter
        const isPath = filterParam.startsWith("/")
        filteredPaths = filteredPaths.filter((path) =>
            isPath
                ? new RegExp(filterParam).test(path)
                : new RegExp(`suite("${filterParam})`).test(
                      readFileSync(path, "utf-8")
                  )
        )
        if (filteredPaths.length === 0) {
            throw new Error(
                `Couldn't find any ${
                    isPath ? "files" : "test names"
                } matching ${filterParam}`
            )
        }
    }
    //TODO we don't want do automatically write to a file, rather let people pass in that as an option if they want it
    // and maybe add a config to let people specify
    console.log(
        `found ${filteredPaths.length} paths matching .bench file format`
    )
    //if filter is passed in we don't wanna run all the files
    for (const path of filteredPaths) {
        try {
            const command = `npx ts-node ${path} --benchmarksPath ${fromCwd(
                "benchmarks.json"
            )}`
            shell(command, {
                env: {
                    ARKTYPE_CHECK_CMD: `${passedArgs.join(" ")}`
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
    if (!options.runner) {
        throw new Error(
            `Must provide a runner command, e.g. 'attest --runner mocha'`
        )
    }
    let prefix = ""

    if (options.runner === "node") {
        const nodeMajorVersion = Number.parseInt(versions.node.split(".")[0])
        if (nodeMajorVersion < 18) {
            throw new Error(
                `Node's test runner requires at least version 18. You are running ${version}.`
            )
        }
        prefix += `node --loader ts-node/esm --test `
    } else {
        prefix += `npx ${options.runner} `
    }
    let processError: unknown

    try {
        if (options.skipTypes) {
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
        shell(`${prefix}`, {
            stdio: "inherit",
            env: { ARKTYPE_CHECK_CMD: `${processArgs.join(" ")} --precache` }
        })
        const runnerSeconds = (Date.now() - runnerStart) / 1000
        console.log(
            `✅ attest: npx ${options.runner} completed in ${runnerSeconds} seconds.\n`
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

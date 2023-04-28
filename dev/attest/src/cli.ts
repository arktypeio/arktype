#!/usr/bin/env node
import { readFileSync } from "node:fs"
import { version } from "node:os"
import { basename } from "node:path"
import { versions } from "node:process"
import type { OptionValues } from "commander"
import { Command } from "commander"
import {
    cacheAssertions,
    cleanupAssertions,
    fromCwd,
    shell,
    walkPaths
} from "./main.js"

const cli = () => {
    const attest = new Command("attest")
    const packageVersion = "0.0.0"
    const description = "⛵ Type-first testing"

    attest
        .version(packageVersion)
        .description(description)
        .option("-r, --runner  <value>", "Run using a specified test runner")
        .option("-s, --skipTypes", "Skip type assertions")
        .option("--file <value>", "Specify a path for bench or tests")
        .option("-h, --help, View details about the cli")
        .option("-b, --bench, Runs benchmarks found in *.bench.ts files")
        .option(
            "-p --benchmarksPath <path>, defines where to save json bench results"
        )
        .option(
            "-f, --filter <filter>, runs benches based on a filter [/filename, benchname]"
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
        benchRunner(options, passedArgs)
    } else {
        testRunner(options, processArgs)
    }
}

const benchRunner = (options: OptionValues, passedArgs: string[]) => {
    let benchFilePaths
    if (options.file) {
        benchFilePaths = [options.file]
    } else {
        benchFilePaths = walkPaths(fromCwd(), {
            include: (path) => basename(path).includes(".bench.")
        })
    }
    let threwDuringBench
    let filteredPaths = benchFilePaths
    if (options.filter) {
        const filterParam = options.filter
        const isPath = filterParam.startsWith("/") && !options.file
        filteredPaths = filteredPaths.filter((path: string) => {
            if (isPath) {
                if (new RegExp(filterParam).test(path)) {
                    const filterIndex = passedArgs.findIndex((arg) =>
                        arg.includes("--filter")
                    )
                    passedArgs.splice(filterIndex, 2)
                    return true
                }
                return false
            } else {
                const matcher = new RegExp(`bench\\("${filterParam}`)
                return matcher.test(readFileSync(path, "utf-8"))
            }
        })
        if (filteredPaths.length === 0) {
            throw new Error(
                `Couldn't find any ${
                    isPath ? "files" : "test names"
                } matching ${filterParam}`
            )
        }
    }
    const writesToFile = options.benchmarksPath
        ? `--benchmarksPath ${options.benchmarksPath}`
        : ""
    for (const path of filteredPaths) {
        try {
            const command = `npx tsx ${path} ${writesToFile}`
            console.log("\n" + path.split("/").slice(-1))
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
}

const testRunner = (options: OptionValues, processArgs: string[]) => {
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
        prefix += `node --loader tsx --test `
    } else {
        prefix += `npx ${options.runner} ${
            options.file ? `'${options.file}'` : ""
        }`
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
            cacheAssertions()
            const cacheSeconds = (Date.now() - cacheStart) / 1000
            console.log(
                `✅ attest: Finished caching type assertions in ${cacheSeconds} seconds.\n`
            )
        }

        const runnerStart = Date.now()
        console.log(prefix)
        shell(prefix, {
            stdio: "inherit",
            env: { ARKTYPE_CHECK_CMD: processArgs.join(" ") }
        })
        const runnerSeconds = (Date.now() - runnerStart) / 1000
        console.log(
            `✅ attest: ${options.runner} completed in ${runnerSeconds} seconds.\n`
        )
    } catch (error) {
        processError = error
    } finally {
        cleanupAssertions()
    }
    if (processError) {
        throw processError
    }
}

cli()

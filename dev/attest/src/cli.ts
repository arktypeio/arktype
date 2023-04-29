#!/usr/bin/env node
import { version } from "node:os"
import { basename } from "node:path"
import { versions } from "node:process"
import { Command } from "commander"
import type { OptionValues } from "commander"
import {
    cacheAssertions,
    cleanupAssertions,
    fromCwd,
    readFile,
    shell,
    walkPaths
} from "./main.js"

const cli = () => {
    const attest = new Command("attest")
    const packageVersion = "0.0.0"
    const description = "⛵ Type-first testing from ArkType"

    attest
        .version(packageVersion)
        .description(description)
        .option("-c, --command  <value>", "How to run the tests")
        .option("-s, --skipTypes", "Skip type assertions")
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

    const suffix = options.bench ? ".bench." : ".test."
    let files = walkPaths(fromCwd(), {
        include: (path) => basename(path).includes(suffix)
    })
    if (typeof options.filter === "string") {
        if (options.filter.startsWith("/")) {
            files = files.filter((file) => file.match(options.filter))
        } else {
            files = files.filter((file) =>
                readFile(file).includes(options.filter)
            )
        }

        if (files.length === 0) {
            throw new Error(`No matches for filter ${options.filter}`)
        }
    }
    if (options.bench) {
        benchRunner(options, passedArgs)
    } else {
        testRunner(options, processArgs)
    }
}

const benchRunner = (options: OptionValues, paths: string[]) => {
    let threwDuringBench
    const writesToFile = options.benchmarksPath
        ? `--benchmarksPath ${options.benchmarksPath}`
        : ""
    for (const path of paths) {
        try {
            const command = `node --loader ts-node/esm ${path} ${writesToFile}`
            console.log("\n" + path.split("/").slice(-1))
            shell(command, {
                env: {
                    ARKTYPE_CHECK_CMD: `${process.argv.join(" ")}`
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

const testRunner = (options: OptionValues, paths: string[]) => {
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
            env: { ARKTYPE_CHECK_CMD: process.argv.join(" ") }
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

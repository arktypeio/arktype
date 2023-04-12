#!/usr/bin/env node
import { version } from "node:os"
import { basename } from "node:path"
import { versions } from "node:process"
import { Command } from "commander"
import { cacheAssertions, cleanupAssertions } from "./main.js"
import { readJson } from "./runtime/fs.js"
import { fromCwd, shell, walkPaths } from "./runtime/main.js"

const attest = new Command()
const packageInfo = readJson("package.json")
const packageVersion = packageInfo.version
const description = packageInfo.description

attest
    .version(packageVersion)
    .description(description)
    .option("-r, --runner  [value]", "Run using a specified test runner")
    .option("-s, --skipTypes", "Skip type assertions")
    .option(
        "-f, --files <value>",
        "Specify the location of the tests you would like to run (maybe)."
    )
    .option("-h, --help, View details about the cli")
    .option("-b, --bench, Runs benchmarks found in *.bench.ts files")
    .parse(process.argv)

const options = attest.opts()
console.log(options)

if (!process.argv.slice(2).length || options.help) {
    attest.outputHelp()
}
if (options.bench) {
    console.log("started search")
    const benchFilePaths = walkPaths(fromCwd(), {
        include: (path) => basename(path).includes(".bench.")
    })

    let threwDuringBench
    for (const path of benchFilePaths) {
        try {
            shell(`npx ts-node ${path}`)
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
            stdio: "inherit"
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

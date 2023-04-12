#!/usr/bin/env node
import { version } from "node:os"
import { versions } from "node:process"
import { Args, Command, Errors, Flags, flush } from "@oclif/core"
import { cacheAssertions, cleanupAssertions } from "../main.js"
import { shell } from "../runtime/shell.js"
export default class Test extends Command {
    static description = "describe the command here"

    // static examples = ["<%= config.bin %> <%= command.id %>"]

    static flags = {
        skipTypes: Flags.boolean({ char: "s" }),
        aFlag: Flags.help()
    }

    //this might not be possible unless jest/mocha/other suites allow for this kind of config in an easyish way
    static args = {
        fileGlob: Args.string({ description: "file glob to test" }),
        runner: Args.string({
            description: "Test runner to be used",
            char: "r"
        })
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Test)
        //command should include --precache
        console.log("why")
        console.log(args)
        console.log(flags)

        let prefix = ""
        const runner = args.runner ?? undefined
        if (!runner) {
            throw new Error(
                `Must provide a runner command, e.g. 'runner mocha'`
            )
        }
        if (runner === "node") {
            const nodeMajorVersion = Number.parseInt(
                versions.node.split(".")[0]
            )
            if (nodeMajorVersion < 18) {
                throw new Error(
                    `Node's test runner requires at least version 18. You are running ${version}.`
                )
            }
            prefix += `node --loader ts-node/esm --test `
        } else {
            prefix += `npx ${runner}`
        }

        let processError: unknown
        try {
            if (flags.skipTypes) {
                this.log(
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
            shell(prefix, {
                stdio: "inherit"
            })
            const runnerSeconds = (Date.now() - runnerStart) / 1000
            this.log(
                `✅ attest: npx mocha completed in ${runnerSeconds} seconds.\n`
            )
        } catch (error) {
            processError = error
        } finally {
            this.log(
                `⏳ attest: Updating inline snapshots and cleaning up cache...`
            )
            const cleanupStart = Date.now()
            cleanupAssertions()
            const cleanupSeconds = (Date.now() - cleanupStart) / 1000
            console.log(
                `✅ attest: Finished cleanup in ${cleanupSeconds} seconds.`
            )
        }
        if (processError) {
            throw processError
        }
    }
}
Test.run().then(
    () => {
        flush
    },
    (e) => {
        Errors.handle(e)
    }
)

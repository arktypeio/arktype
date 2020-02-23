#!/usr/bin/env node
import { Command } from "commander"
import { install } from "./install"

const cli = new Command()

cli.version(require("../package.json").version)

cli.command("app")
    .description("Launch the Redo app")
    .action(async () => {
        console.log("Launching the app...")
        await install()
    })

cli.command("test")
    .description("Run Redo tests")
    .action(() => console.log(`Running tests...`))

cli.command("create")
    .description("Create a new test")
    .action(() => console.log("Creating a new test..."))

const run = async () => await cli.parseAsync(process.argv)
run()

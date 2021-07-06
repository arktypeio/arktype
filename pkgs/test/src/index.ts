#!/usr/bin/env node
import { Command } from "commander"
import { shell } from "@re-do/node-utils"
import { getPath } from "./install"
import { join } from "path"

const cli = new Command()
const version = require(join(__dirname, "package.json")).version

cli.version(version)

cli.command("launch")
    .description("Launch the Redo app")
    .action(async () => {
        console.log("Launching the app...")
        shell(await getPath(version))
    })

cli.command("test")
    .description("Run Redo tests")
    .action(() => {
        console.log("Running tests...")
    })

cli.command("create")
    .description("Create a new test")
    .action(() => console.log("Creating a new test..."))

const run = async () => await cli.parseAsync(process.argv)
run()

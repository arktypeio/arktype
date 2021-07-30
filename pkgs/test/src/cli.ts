#!/usr/bin/env node
import { Command } from "commander"
import { shell } from "@re-do/node-utils"
import { getPath, version } from "./install"

const cli = new Command()

cli.version(version)

cli.command("launch")
    .description("Launch the Redo app")
    .action(async () => {
        const executablePath = await getPath(version)
        console.log("Launching the app...")
        shell(executablePath)
    })

const run = async () => await cli.parseAsync(process.argv)
run()

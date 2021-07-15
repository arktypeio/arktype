#!/usr/bin/env node
import { Command } from "commander"
import { shell } from "@re-do/node-utils"
import { getPath, version } from "./install"
import { promptIfNewReleaseAvailable } from "./updateChecker"

const cli = new Command()

cli.version(version)

cli.command("launch")
    .description("Launch the Redo app")
    .action(async () => {
        console.log("Launching the app...")
        await promptIfNewReleaseAvailable(version)
        shell(await getPath(version))
    })
const run = async () => await cli.parseAsync(process.argv)
run()

#!/usr/bin/env node
import { Command } from "commander"
import { shell } from "@re-do/node-utils"
import { getPath, install, version } from "./install"
import { isCurrentPackageOutdated, latestVersionAvailable } from "./installHelpers"

const cli = new Command()

cli.version(version)

cli.command("launch")
    .description("Launch the Redo app")
    .action(async () => {
        console.log("Launching the app...")
        shell(await getPath(version))
        if (isCurrentPackageOutdated(version)) {
            console.log("New Update is Avaiable. You can Upgrade to the latest version with redo update.")
        }
    })
cli.command("upgrade")
    .description("Upgrade Redo to the lastest available version")
    .action(async () => {
        const release = await latestVersionAvailable()
        isCurrentPackageOutdated(version)  
            ? install(await getPath(release))
            : console.log("Redo is up to date!")
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

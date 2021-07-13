#!/usr/bin/env node
import { Command } from "commander"
import { shell } from "@re-do/node-utils"
import { getPath, install, version } from "./install"
import { isCurrentPackageOutdated, latestVersionAvailable } from "./installHelpers"

const greenText = "\x1b[32m"

const cli = new Command()

cli.version(version)

cli.command("launch")
    .description("Launch the Redo app")
    .action(async () => {
        console.log("Launching the app...")
        if (await isCurrentPackageOutdated(version)) {
            console.log(greenText, "New Update is Avaiable. You can Upgrade to the latest version with redo update.")
        }
        shell(await getPath(version))
    })
cli.command("upgrade")
    .description("Upgrade Redo to the lastest available version")
    .action(async () => {
        if (await isCurrentPackageOutdated(version)) {
            const release = await latestVersionAvailable()
            shell(await getPath(release))
            console.log("Redo has been updated to", greenText, release)
        } else {
            console.log(greenText, "Redo is up to date!")
        }
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

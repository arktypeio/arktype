#!/usr/bin/env node
import { Command } from "commander"
import { ensureRedoDir, fromRedo, shell } from "@re-do/node-utils"
import { getPath, version } from "./install"
import { isNewVersionAvailable, isCurrentVersionOutdated } from "./installHelpers"
import { readdir, rmSync } from "fs"

const cli = new Command()

cli.version(version)
cli.command("launch")
    .description("Launch the Redo app")
    .action(async () => {
        console.log("Launching the app...")
        const {outdated} = await isNewVersionAvailable(version)
        if (outdated) {
            console.log("New Update is Avaiable. You can Upgrade to the latest version with redo update.")
        }
        shell(await getPath(version))
    })
cli.command("upgrade")
    .description("Upgrade Redo to the latest available version")
    .action(async () => {
        const {outdated, release} = await isNewVersionAvailable(version)
        if (outdated) {
            shell(await getPath(release!))
            console.log("Redo has been updated to " + release)
        } else {
            console.log("Redo is up to date!")
        }
    })
cli.command("clean")
    .description("Remove all instances of redo older than version found in package.json")
    .action(async () => {
        console.log(`Removing any versions of redo older than ${version}`)
        const REDO_DIR = ensureRedoDir()
        readdir(REDO_DIR,(_, content)=>{
            content.forEach((file)=>{
                if(isCurrentVersionOutdated(file, version)){
                    const path = `${fromRedo()}/${file}`
                    rmSync(path, {recursive:true, force:true})
                    console.log(`Removed version v${file} from /.redo directory`)
                }
            })
        })
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

import { Command } from "commander"
import { shell } from "@re-do/node"
import { getPath } from "./install"
import { version } from "../package.json"

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

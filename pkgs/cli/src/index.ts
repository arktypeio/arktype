#!/usr/bin/env node
import { Command } from "commander"

const cli = new Command()

cli.version(require("../package.json").version)

cli.command("test")
    .description("Run redo tests")
    .action(() => console.log(`Hello from Redo!`))

cli.parse(process.argv)

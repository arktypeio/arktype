#!/usr/bin/env node

// runs a script against the repo's sources: ts <file> [args]
import { execSync } from "node:child_process"
import { addNodeDevOptions } from "./nodeOptions.ts"

addNodeDevOptions()

execSync(`node ${process.argv.slice(2).join(" ")}`, { stdio: "inherit" })

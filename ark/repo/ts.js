#!/usr/bin/env node

// @ts-check
import { execSync } from "node:child_process"
import { addNodeDevOptions } from "./nodeOptions.js"

addNodeDevOptions()

execSync(`node ${process.argv.slice(2).join(" ")}`, { stdio: "inherit" })

#!/usr/bin/env node
import { fileName } from "@ark/fs"
import { basename } from "path"
import { precache } from "./precache.js"
import { stats } from "./stats.js"
import { trace } from "./trace.js"

const subcommands = {
	precache,
	trace,
	stats
}

type Subcommand = keyof typeof subcommands

const baseFileName = basename(fileName())

const thisFileIndex = process.argv.findIndex(
	// if running from build output in npm, will be a file called `attest`
	// if running from build output in pnpm, will be cli.js in build output
	s => s.endsWith(baseFileName) || s.endsWith("attest")
)

if (thisFileIndex === -1)
	throw new Error(`Expected to find an argument ending with "${baseFileName}"`)

const subcommand = process.argv[thisFileIndex + 1]

if (!(subcommand in subcommands)) {
	console.error(
		`Expected a command like 'attest <subcommand>', where <subcommand> is one of:\n${Object.keys(
			subcommands
		)}`
	)
	process.exit(1)
}

const args = process.argv.slice(thisFileIndex + 2)

subcommands[subcommand as Subcommand](args)

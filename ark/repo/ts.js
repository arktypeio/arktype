#!/usr/bin/env node

// @ts-check
import { execSync } from "node:child_process"

const [major, minor] = process.version.replace("v", "").split(".").map(Number)

const versionedFlags =
	major > 22 || (major === 22 && minor >= 7) ?
		"--experimental-transform-types --no-warnings"
	:	(console.log(
			"--experimental-transform-types requires Node >= 22.7.0, falling back to tsx..."
		),
		"--import tsx")

process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ""} --conditions ark-ts ${versionedFlags}`

execSync(`node ${process.argv.slice(2).join(" ")}`, { stdio: "inherit" })

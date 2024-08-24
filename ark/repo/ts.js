#!/usr/bin/env node

// @ts-check
import { execSync } from "node:child_process"

const [major, minor] = process.version.replace("v", "").split(".").map(Number)

const versionedFlags =
	major > 22 || (major === 22 && minor >= 6) ?
		"--experimental-strip-types --no-warnings"
	:	(console.log(
			"--experimental-strip-types requires Node >= 22.6.0, falling back to tsx..."
		),
		"--import tsx")

execSync(
	`node --conditions ark-ts ${versionedFlags} ${process.argv.slice(2).join(" ")}`,
	{ stdio: "inherit" }
)

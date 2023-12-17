#!/usr/bin/env node
// @ts-check
import { fileName } from "@arktype/fs"
import { writeAssertionData } from "./out/main.js"

const args = process.argv.slice(process.argv.indexOf(fileName()) + 1)

if (!args.at(-1)) {
	throw new Error(
		`Expected an argument for the cache file like "attestPrecache .attest/assertions/typescript.json"`
	)
}

writeAssertionData(args.at(-1))

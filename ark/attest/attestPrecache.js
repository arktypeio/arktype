#!/usr/bin/env node
// @ts-check
import { ensureDir, fileName } from "@arktype/fs"
import { basename, join } from "path"
import { writeAssertionData } from "./out/main.js"

const baseFileName = basename(fileName())

const thisFileIndex = process.argv.findIndex((s) => s.endsWith(baseFileName))

if (thisFileIndex === -1) {
	throw new Error(`Expected to find an argument ending with "${baseFileName}"`)
}

const args = process.argv.slice(thisFileIndex + 1)

let cacheFileToWrite = args.at(-1)

if (!cacheFileToWrite) {
	cacheFileToWrite = join(ensureDir(".attest"), "typescript.json")
}

writeAssertionData(cacheFileToWrite)

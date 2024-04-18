import { contextualize } from "@arktype/attest"
import { fromHere, readFile } from "@arktype/fs"
import { equal } from "node:assert/strict"
import { runThenGetContents } from "./utils.js"

contextualize(() => {
	it("bench populates file", () => {
		const actual = runThenGetContents(fromHere("benchTemplate.ts"))
		const expectedOutput = readFile(
			fromHere("benchExpectedOutput.ts")
		).replaceAll("\r\n", "\n")
		equal(actual, expectedOutput)
	})

	it("snap populates file", () => {
		const actual = runThenGetContents(fromHere("snapTemplate.ts"))
		const expectedOutput = readFile(
			fromHere("snapExpectedOutput.ts")
		).replaceAll("\r\n", "\n")
		equal(actual, expectedOutput)
	})
})

import { contextualize } from "@ark/attest"
import { fromHere, readFile } from "@ark/fs"
import { equal } from "node:assert/strict"
import { runThenGetContents } from "./utils.ts"

contextualize(() => {
	it("bench populates file", () => {
		const actual = runThenGetContents(fromHere("benchTemplate.ts"))
		const expectedOutput = readFile(
			fromHere("benchExpectedOutput.ts")
		).replace(/\r\n/g, "\n")
		equal(actual, expectedOutput)
	}).timeout(60000)

	it("snap populates file", () => {
		const actual = runThenGetContents(fromHere("snapTemplate.ts"))
		const expectedOutput = readFile(
			fromHere("snapExpectedOutput.ts")
		).replace(/\r\n/g, "\n")
		equal(actual, expectedOutput)
	}).timeout(60000)
})

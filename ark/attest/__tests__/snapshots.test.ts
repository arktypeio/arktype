import { fromHere, readFile } from "@arktype/fs"
import { equal } from "node:assert/strict"
import { runThenGetContents } from "./utils.js"

const benchTemplate = fromHere("benchTemplate.ts")
const expectedOutput = readFile(fromHere("benchExpectedOutput.ts")).replaceAll(
	"\r\n",
	"\n"
)

describe("bench", () => {
	it("populates file", () => {
		const actual = runThenGetContents(benchTemplate)
		equal(actual, expectedOutput)
	}).timeout(120000)
})

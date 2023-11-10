import { equal } from "node:assert/strict"
import { fromHere, readFile } from "@arktype/fs"

import { runThenGetContents } from "./utils.ts"

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

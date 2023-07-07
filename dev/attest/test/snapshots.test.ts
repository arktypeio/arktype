import { equal } from "node:assert/strict"
import { fromHere, readFile } from "@arktype/attest"
import { describe, test } from "mocha"
import { runThenGetContents } from "./utils.js"

const benchTemplate = fromHere("benchTemplate.ts")
const expectedOutput = readFile(fromHere("benchExpectedOutput.ts")).replaceAll(
    "\r\n",
    "\n"
)

describe("bench", () => {
    test("populates file", () => {
        const actual = runThenGetContents(benchTemplate)
        equal(actual, expectedOutput)
    }).timeout(120000)
})

import { equal } from "node:assert/strict"
import { describe, it } from "mocha"
import { fromHere, readFile } from "../src/main.js"
import { runThenGetContents } from "./utils.js"

const benchActual = fromHere("benchActual.ts")
const benchTemplate = fromHere("benchTemplate.ts")
const expectedOutput = readFile(fromHere("benchExpectedOutput.ts")).replaceAll(
    "\r\n",
    "\n"
)

describe("bench", () => {
    it("populates file", () => {
        const actual = runThenGetContents(benchActual, benchTemplate)
        equal(actual, expectedOutput)
    }).timeout(120000)
})

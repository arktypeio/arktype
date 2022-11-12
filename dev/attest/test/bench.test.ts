import { strict } from "node:assert"
import { describe, test } from "mocha"
import { fromHere, readFile } from "../../runtime/api.js"
import { runThenGetContents } from "./utils.js"

const benchTemplate = fromHere("benchTemplate.ts")
const expectedOutput = readFile(fromHere("benchExpectedOutput.ts"))

describe("bench", () => {
    test("populates file", () => {
        const actual = runThenGetContents(benchTemplate, {
            includeBenches: true,
            benchFormat: { noExternal: true }
        })
        strict.equal(actual, expectedOutput)
    }).timeout(30000)
})

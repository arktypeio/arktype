import * as assert from "node:assert/strict"
import { describe, it } from "mocha"
import { fromHere, readFile } from "../../runtime/api.ts"
import { runThenGetContents } from "./utils.ts"

const benchTemplate = fromHere("benchTemplate.ts")
const expectedOutput = readFile(fromHere("benchExpectedOutput.ts"))

describe("bench", () => {
    it("populates file", () => {
        const actual = runThenGetContents(benchTemplate, {
            includeBenches: true,
            benchFormat: { noExternal: true }
        })
        assert.equal(actual, expectedOutput)
    }).timeout(8000)
})

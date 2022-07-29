import { strict } from "node:assert"
import { fromHere, readFile } from "@re-/node"
import { describe, test } from "vitest"
import { runThenGetContents } from "../../__tests__/utils.js"

const benchTemplate = fromHere("benchTemplate.ts")
const expectedOutput = readFile(fromHere("benchExpectedOutput.ts"))

describe("bench", () => {
    test("populates file", () => {
        const actual = runThenGetContents(benchTemplate, {
            includeBenches: true
        })
        strict.equal(actual, expectedOutput)
    }, 10000)
})

import { strict } from "node:assert"
import { fromHere, readFile } from "@re-/node"
import { describe, test } from "mocha"
import { runThenGetContents } from "../../../__tests__/utils.js"

const snapshotTemplate = fromHere("snapWriteTemplate.ts")
const expectedOutput = readFile(fromHere("snapWriteExpectedOutput.ts"))

describe("inline snap write", () => {
    test("dynamic", () => {
        const actual = runThenGetContents(snapshotTemplate)
        strict.equal(actual, expectedOutput)
    }).timeout(30000)
    test("precache", () => {
        const actual = runThenGetContents(snapshotTemplate, { precache: true })
        strict.equal(actual, expectedOutput)
    }).timeout(30000)
})

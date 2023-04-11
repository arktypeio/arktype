import * as assert from "node:assert/strict"
import { describe, it } from "mocha"
import { fromHere, readFile } from "../../src/runtime/fs.js"
import { runThenGetContents } from "../utils.js"

const snapshotTemplate = fromHere("snapWriteTemplate.js")
const expectedOutput = readFile(fromHere("snapWriteExpectedOutput.js"))
const noExternal = { noExternal: true }
describe("inline snap write", () => {
    it("dynamic", () => {
        const actual = runThenGetContents(snapshotTemplate, {
            benchFormat: noExternal
        })
        assert.equal(actual, expectedOutput)
    })
    it("precache", () => {
        const actual = runThenGetContents(snapshotTemplate, {
            precache: true,
            benchFormat: noExternal
        })
        assert.equal(actual, expectedOutput)
    })
})

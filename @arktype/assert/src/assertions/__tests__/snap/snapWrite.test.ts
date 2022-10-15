import { strict } from "node:assert"
import { fromHere, readFile } from "@arktype/node"
import { describe, test } from "mocha"
import { runThenGetContents } from "../../../__tests__/utils.js"

const snapshotTemplate = fromHere("snapWriteTemplate.ts")
const expectedOutput = readFile(fromHere("snapWriteExpectedOutput.ts"))
const noExternal = { noExternal: true }
describe("inline snap write", () => {
    test("dynamic", () => {
        const actual = runThenGetContents(snapshotTemplate, {
            benchFormat: noExternal
        })
        strict.equal(actual, expectedOutput)
    }).timeout(30000)
    test("precache", () => {
        const actual = runThenGetContents(snapshotTemplate, {
            precache: true,
            benchFormat: noExternal
        })
        strict.equal(actual, expectedOutput)
    }).timeout(30000)
})

import { fromHere } from "@re-/node"
import { describe, expect, test } from "vitest"
import { runThenGetContents } from "../../../__tests__/utils.js"

const snapshotTemplate = fromHere("snapWriteTemplate.ts")

describe("inline snap write", () => {
    test("dynamic", () => {
        expect(runThenGetContents(snapshotTemplate, false)).toMatchSnapshot()
    }, 9999)
    test("precache", () => {
        expect(runThenGetContents(snapshotTemplate, true)).toMatchSnapshot()
    }, 9999)
})

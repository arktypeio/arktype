import { fromHere } from "@re-/node"
import { describe, expect, test } from "vitest"
import { runThenGetContents } from "../../__tests__/utils.js"

const benchTemplate = fromHere("benchTemplate.ts")

describe("bench", () => {
    test("populates file", () => {
        expect(runThenGetContents(benchTemplate, false)).toMatchSnapshot()
    }, 9999)
})

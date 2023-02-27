import * as assert from "node:assert/strict"
import { describe, it } from "mocha"
import { attest } from "../main.ts"

const o = { ark: "type" }

describe("attest", () => {
    it("type toString", () => {
        attest(o).type.toString("{ ark: string; }")
        attest(o).type.toString.is("{ ark: string; }")
    })
    it("typed", () => {
        attest(o).typed as { ark: string }
    })
    it("equals", () => {
        attest(o).equals({ ark: "type" })
    })
    it("object", () => {
        attest({ i: "love my wife" }).typed as { i: string }
        assert.throws(
            () => attest({ g: "whiz" as unknown }).typed as { g: string },
            assert.AssertionError,
            "unknown"
        )
    })
    it("typed allows equivalent types", () => {
        const actual = { a: true, b: false }
        attest(actual).typed as {
            b: boolean
            a: boolean
        }
    })
    it("nonexistent types always fail", () => {
        // @ts-expect-error
        const nonexistent: NonExistent = {}
        assert.throws(
            () =>
                attest(nonexistent).typed as {
                    something: "specific"
                },
            assert.AssertionError,
            "specific"
        )
    })
    it("functional asserts don't exist on pure value types", () => {
        // @ts-expect-error
        attest(5).throws
    })
})

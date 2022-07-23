import { AssertionError, strict } from "node:assert"
import { assert } from "../src/index.js"
const o = { re: "do" }

describe("Assertions", () => {
    it("type toString", () => {
        assert(o).type.toString("{ re: string; }")
        assert(o).type.toString.is("{ re: string; }")
    })
    it("typed", () => {
        assert(o).typed as { re: string }
    })
    it("equals", () => {
        assert(o).equals({ re: "do" })
    })
    it("object", () => {
        assert({ i: "love my wife" }).typed as { i: string }
        strict.throws(
            () => assert({ g: "whiz" as unknown }).typed as { g: string },
            strict.AssertionError,
            "unknown"
        )
    })
    it("union of function chainable", () => {
        const t: number | ((n: number) => number) = (n: number) => n
        // Temporarily disabled, can't get types to split non-functional values into comparable checks
        // assert(t).is(t)
        assert(t).args(5).returns(5)
    })
    it("typed allows equivalent types", () => {
        const actual = { a: true, b: false }
        assert(actual).typed as {
            b: boolean
            a: boolean
        }
    })
    it("nonexistent types always fail", () => {
        // @ts-expect-error
        const nonexistent: NonExistent = {}
        strict.throws(
            () =>
                assert(nonexistent).typed as {
                    something: "specific"
                },
            AssertionError,
            "specific"
        )
    })
    it("functional asserts don't exist on pure value types", () => {
        // @ts-expect-error
        assert(5).throws
    })
    it("value asserts don't exist on pure functional types", () => {
        // @ts-expect-error
        assert(() => {}).is
    })
})

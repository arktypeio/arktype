import { AssertionError, strict } from "node:assert"
import { describe, test } from "vitest"
import { assert } from "../index.js"
const o = { re: "do" }

describe("Assertions", () => {
    test("type toString", () => {
        assert(o).type.toString("{ re: string; }")
        assert(o).type.toString.is("{ re: string; }")
    })
    test("typed", () => {
        assert(o).typed as { re: string }
    })
    test("equals", () => {
        assert(o).equals({ re: "do" })
    })
    test("object", () => {
        assert({ i: "love my wife" }).typed as { i: string }
        strict.throws(
            () => assert({ g: "whiz" as unknown }).typed as { g: string },
            strict.AssertionError,
            "unknown"
        )
    })
    test("union of function chainable", () => {
        const t: number | ((n: number) => number) = (n: number) => n
        // Temporarily disabled, can't get types to split non-functional values into comparable checks
        // assert(t).is(t)
        assert(t).args(5).returns(5)
    })
    test("typed allows equivalent types", () => {
        const actual = { a: true, b: false }
        assert(actual).typed as {
            b: boolean
            a: boolean
        }
    })
    test("nonexistent types always fail", () => {
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
    test("functional asserts don't exist on pure value types", () => {
        // @ts-expect-error
        assert(5).throws
    })
    test("value asserts don't exist on pure functional types", () => {
        // @ts-expect-error
        assert(() => {}).is
    })
})

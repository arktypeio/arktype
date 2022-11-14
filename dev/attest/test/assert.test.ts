import { AssertionError, strict } from "node:assert"
import { describe, test } from "mocha"
import { attest } from "../exports.js"
const o = { re: "do" }

describe("Assertions", () => {
    test("type toString", () => {
        attest(o).type.toString("{ re: string; }")
        attest(o).type.toString.is("{ re: string; }")
    })
    test("typed", () => {
        attest(o).typed as { re: string }
    })
    test("equals", () => {
        attest(o).equals({ re: "do" })
    })
    test("object", () => {
        attest({ i: "love my wife" }).typed as { i: string }
        strict.throws(
            () => attest({ g: "whiz" as unknown }).typed as { g: string },
            strict.AssertionError,
            "unknown"
        )
    })
    test("union of function chainable", () => {
        const t: number | ((n: number) => number) = (n: number) => n
        // Temporarily disabled, can't get types to split non-functional values into comparable checks
        // attest(t).is(t)
        attest(t).args(5).returns(5)
    })
    test("typed allows equivalent types", () => {
        const actual = { a: true, b: false }
        attest(actual).typed as {
            b: boolean
            a: boolean
        }
    })
    test("nonexistent types always fail", () => {
        // @ts-expect-error
        const nonexistent: NonExistent = {}
        strict.throws(
            () =>
                attest(nonexistent).typed as {
                    something: "specific"
                },
            AssertionError,
            "specific"
        )
    })
    test("functional asserts don't exist on pure value types", () => {
        // @ts-expect-error
        attest(5).throws
    })
    test("value asserts don't exist on pure functional types", () => {
        // @ts-expect-error
        attest(() => {}).is
    })
    test("narrowedValue", () => {
        attest({ a: "narrow" } as { a: "narrow" }).narrowedValue({
            a: "narrow"
        })
        strict.throws(
            () => {
                attest({ a: "narrow" }).narrowedValue({ a: "narrow" })
            },
            AssertionError,
            "string"
        )
    })
})

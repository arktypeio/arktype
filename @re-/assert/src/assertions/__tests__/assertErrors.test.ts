import { strict } from "node:assert"
import { describe, test } from "mocha"
import { assert } from "../../index.js"

const n = 5
const o = { re: "do" }

describe("assertion errors", () => {
    test("not equal", () => {
        strict.throws(
            () => assert(o).equals({ re: "doo" }),
            strict.AssertionError,
            "do !== doo"
        )
    })
    test("incorrect type", () => {
        strict.throws(
            () => assert(o).typed as { re: number },
            strict.AssertionError,
            "o is not of type number"
        )
    })
    test("any type", () => {
        assert(n as any).typedValue(5 as any)
        assert(o as any).typed as any
        strict.throws(
            () => assert(n).typedValue(5 as any),
            strict.AssertionError,
            "number"
        )
        strict.throws(
            () => assert({} as unknown).typed as any,
            strict.AssertionError,
            "unknown"
        )
    })
    test("typedValue", () => {
        const getDo = () => "do"
        assert(o).typedValue({ re: getDo() })
        strict.throws(
            () => assert(o).typedValue({ re: "do" as any }),
            strict.AssertionError,
            "any"
        )
        strict.throws(
            () => assert(o).typedValue({ re: "don't" }),
            strict.AssertionError,
            "don't"
        )
    })
    test("assert unknown ignores type", () => {
        const myValue = { a: ["+"] } as const
        const myExpectedValue = { a: ["+"] }
        // @ts-expect-error
        assert(myValue).equals(myExpectedValue)
        assert(myValue).unknown.equals(myExpectedValue)
        strict.throws(
            () => assert(myValue).unknown.is(myExpectedValue),
            strict.AssertionError,
            "not reference-equal"
        )
    })
    test("multiline", () => {
        assert({
            several: true,
            lines: true,
            long: true
        } as object).typed as object
        strict.throws(
            () =>
                assert({
                    several: true,
                    lines: true,
                    long: true
                }).typed as object,
            strict.AssertionError,
            "object"
        )
    })
    test("nonexistent types always fail", () => {
        // @ts-expect-error
        const nonexistent: NonExistent = {}
        strict.throws(
            () =>
                assert(nonexistent).typed as {
                    something: "specific"
                },
            strict.AssertionError,
            "specific"
        )
    })
})

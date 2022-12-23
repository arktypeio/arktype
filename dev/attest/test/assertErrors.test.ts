import { strict } from "node:assert"
import { describe, test } from "mocha"
import { attest } from "../exports.ts"

const n = 5
const o = { re: "do" }

describe("assertion errors", () => {
    test("not equal", () => {
        strict.throws(
            () => attest(o).equals({ re: "doo" }),
            strict.AssertionError,
            "do !== doo"
        )
    })
    test("incorrect type", () => {
        strict.throws(
            () => attest(o).typed as { re: number },
            strict.AssertionError,
            "o is not of type number"
        )
    })
    test("any type", () => {
        attest(n as any).typedValue(5 as any)
        attest(o as any).typed as any
        strict.throws(
            () => attest(n).typedValue(5 as any),
            strict.AssertionError,
            "number"
        )
        strict.throws(
            () => attest({} as unknown).typed as any,
            strict.AssertionError,
            "unknown"
        )
    })
    test("typedValue", () => {
        const getDo = () => "do"
        attest(o).typedValue({ re: getDo() })
        strict.throws(
            () => attest(o).typedValue({ re: "do" as any }),
            strict.AssertionError,
            "any"
        )
        strict.throws(
            () => attest(o).typedValue({ re: "don't" }),
            strict.AssertionError,
            "don't"
        )
    })
    test("assert unknown ignores type", () => {
        const myValue = { a: ["+"] } as const
        const myExpectedValue = { a: ["+"] }
        // @ts-expect-error
        attest(myValue).equals(myExpectedValue)
        attest(myValue).unknown.equals(myExpectedValue)
        strict.throws(
            () => attest(myValue).unknown.is(myExpectedValue),
            strict.AssertionError,
            "not reference-equal"
        )
    })
    test("multiline", () => {
        attest({
            several: true,
            lines: true,
            long: true
        } as object).typed as object
        strict.throws(
            () =>
                attest({
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
                attest(nonexistent).typed as {
                    something: "specific"
                },
            strict.AssertionError,
            "specific"
        )
    })
})

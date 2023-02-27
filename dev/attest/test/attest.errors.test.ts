import * as assert from "node:assert/strict"
import { describe, it } from "mocha"
import { attest } from "../main.ts"

const n = 5
const o = { re: "do" }

describe("attest errors", () => {
    it("not equal", () => {
        assert.throws(
            () => attest(o).equals({ re: "doo" }),
            assert.AssertionError,
            "do !== doo"
        )
    })
    it("incorrect type", () => {
        assert.throws(
            () => attest(o).typed as { re: number },
            assert.AssertionError,
            "o is not of type number"
        )
    })
    it("any type", () => {
        attest(n as any).typedValue(5 as any)
        attest(o as any).typed as any
        assert.throws(
            () => attest(n).typedValue(5 as any),
            assert.AssertionError,
            "number"
        )
        assert.throws(
            () => attest({} as unknown).typed as any,
            assert.AssertionError,
            "unknown"
        )
    })
    it("typedValue", () => {
        const getDo = () => "do"
        attest(o).typedValue({ re: getDo() })
        assert.throws(
            () => attest(o).typedValue({ re: "do" as any }),
            assert.AssertionError,
            "any"
        )
        assert.throws(
            () => attest(o).typedValue({ re: "don't" }),
            assert.AssertionError,
            "don't"
        )
    })
    it("assert unknown ignores type", () => {
        const myValue = { a: ["+"] } as const
        const myExpectedValue = { a: ["+"] }
        // @ts-expect-error
        attest(myValue).equals(myExpectedValue)
        attest(myValue).unknown.equals(myExpectedValue)
        assert.throws(
            () => attest(myValue).unknown.is(myExpectedValue),
            assert.AssertionError,
            "not reference-equal"
        )
    })
    it("multiline", () => {
        attest({
            several: true,
            lines: true,
            long: true
        } as object).typed as object
        assert.throws(
            () =>
                attest({
                    several: true,
                    lines: true,
                    long: true
                }).typed as object,
            assert.AssertionError,
            "object"
        )
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
})

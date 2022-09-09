import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../index.js"

describe("bigintLiteral", () => {
    describe("type", () => {
        test("positive", () => {
            assert(type("999999999999999n").infer).typed as 999999999999999n
        })
        test("negative", () => {
            assert(type("-1n").infer).typed as -1n
        })
        describe("errors", () => {
            test("decimal", () => {
                // @ts-expect-error
                assert(() => type("99999.99n")).throwsAndHasTypeError(
                    "'99999.99n' is not a builtin type and does not exist in your space."
                )
            })
        })
    })
    describe("validation", () => {
        test("positive", () => {
            assert(
                // Is prime :D
                type("12345678910987654321n").check(12345678910987654321n)
                    .errors
            ).is(undefined)
        })
        test("negative", () => {
            assert(
                type("-18446744073709551616n").check(-BigInt(2 ** 64)).errors
            ).is(undefined)
        })
        describe("errors", () => {
            test("wrong value", () => {
                assert(type("999n").check(1000n).errors?.summary).snap(
                    `1000n is not assignable to 999n.`
                )
            })
            test("non-bigint", () => {
                assert(type("0n").check(0).errors?.summary).snap(
                    `0 is not assignable to 0n.`
                )
            })
        })
    })
    describe("generation", () => {
        test("positive", () => {
            assert(type("1n").create()).is(1n)
        })
        test("negative", () => {
            assert(type("-1n").create()).is(-1n)
        })
    })
})

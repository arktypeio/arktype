import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../index.js"

describe("bigintLiteral", () => {
    describe("type", () => {
        /*
         * TODO: Until ts-morph's embedded TS version is >= 4.8, these will still be inferred as bigint
         */
        test("positive", () => {
            // assert(model("999999999999999n").type).typed as 999999999999999n
            assert(type("999999999999999n").infer).typed as bigint
        })
        test("negative", () => {
            // assert(model("-1n").type).typed as -1n
            assert(type("-1n").infer).typed as bigint
        })
        describe("errors", () => {
            test("decimal", () => {
                // @ts-expect-error
                assert(() => type("99999.99n")).throwsAndHasTypeError(
                    "Unable to determine the type of '99999.99n'."
                )
            })
        })
    })
    describe("validation", () => {
        test("positive", () => {
            assert(
                // Is prime :D
                type("12345678910987654321n").validate(12345678910987654321n)
                    .error
            ).is(undefined)
        })
        test("negative", () => {
            assert(
                type("-18446744073709551616n").validate(-BigInt(2 ** 64)).error
            ).is(undefined)
        })
        describe("errors", () => {
            test("wrong value", () => {
                assert(type("999n").validate(1000n).error?.message).snap(
                    `1000n is not assignable to 999n.`
                )
            })
            test("non-bigint", () => {
                assert(type("0n").validate(0).error?.message).snap(
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

import { assert } from "@re-/assert"
import { eager, model } from "../../src/index.js"

describe("bigintLiteral", () => {
    describe("type", () => {
        /*
         * TODO: Until ts-morph's embedded TS version is >= 4.8, these will still be inferred as bigint
         */
        it("positive", () => {
            // assert(model("999999999999999n").type).typed as 999999999999999n
            assert(model("999999999999999n").type).typed as bigint
        })
        it("negative", () => {
            // assert(model("-1n").type).typed as -1n
            assert(model("-1n").type).typed as bigint
        })
        describe("errors", () => {
            it("decimal", () => {
                // @ts-expect-error
                assert(() => eager("99999.99n")).throwsAndHasTypeError(
                    "Unable to determine the type of '99999.99n'."
                )
            })
        })
    })
    describe("validation", () => {
        it("positive", () => {
            assert(
                // Is prime :D
                model("12345678910987654321n").validate(12345678910987654321n)
                    .error
            ).is(undefined)
        })
        it("negative", () => {
            assert(
                model("-18446744073709551616n").validate(-BigInt(2 ** 64)).error
            ).is(undefined)
        })
        describe("errors", () => {
            it("wrong value", () => {
                assert(model("999n").validate(1000n).error?.message).snap(
                    `1000n is not assignable to 999n.`
                )
            })
            it("non-bigint", () => {
                assert(model("0n").validate(0).error?.message).snap(
                    `0 is not assignable to 0n.`
                )
            })
        })
    })
    describe("generation", () => {
        it("positive", () => {
            assert(model("1n").create()).is(1n)
        })
        it("negative", () => {
            assert(model("-1n").create()).is(-1n)
        })
    })
})

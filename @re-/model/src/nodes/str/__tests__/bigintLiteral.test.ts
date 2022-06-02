import { assert } from "@re-/assert"
import { model } from "@re-/model"

describe("bigintLiteral", () => {
    describe("type", () => {
        it("positive", () => {
            assert(model("999999999999999n").type).typed as bigint
        })
        it("negative", () => {
            assert(model("-1n").type).typed as bigint
        })
        describe("errors", () => {
            it("decimal", () => {
                // @ts-expect-error
                assert(() => model("99999.99n")).throwsAndHasTypeError(
                    "Unable to determine the type of '99999.99n'."
                )
            })
        })
    })
    describe("validation", () => {
        it("positive", () => {
            assert(
                // Is prime :D
                model("12345678910987654321n").validate(
                    12_345_678_910_987_654_321n
                ).error
            ).is(undefined)
        })
        it("negative", () => {
            assert(
                model("-18446744073709551616n").validate(-BigInt(2 ** 64)).error
            ).is(undefined)
        })
        describe("errors", () => {
            it("wrong value", () => {
                assert(model("999n").validate(1000n).error).snap(
                    `1000n is not assignable to 999n.`
                )
            })
            it("non-bigint", () => {
                assert(model("0n").validate(0).error).snap(
                    `0 is not assignable to 0n.`
                )
            })
        })
    })
    describe("generation", () => {
        it("positive", () => {
            assert(model("1n").generate()).is(1n)
        })
        it("negative", () => {
            assert(model("-1n").generate()).is(-1n)
        })
    })
})

import { assert } from "@re-/assert"
import { create } from "@re-/model"

export const testBigintLiteral = () => {
    describe("type", () => {
        test("positive", () => {
            assert(create("999999999999999n").type).typed as bigint
        })
        test("negative", () => {
            assert(create("-1n").type).typed as bigint
        })
        describe("errors", () => {
            test("decimal", () => {
                // @ts-expect-error
                assert(() => create("99999.99n")).throwsAndHasTypeError(
                    "Unable to determine the type of '99999.99n'."
                )
            })
        })
    })
    describe("validation", () => {
        test("positive", () => {
            assert(
                // Is prime :D
                create("12345678910987654321n").validate(12345678910987654321n)
                    .error
            ).is(undefined)
        })
        test("negative", () => {
            assert(
                create("-18446744073709551616n").validate(-BigInt(2 ** 64))
                    .error
            ).is(undefined)
        })
        describe("errors", () => {
            test("wrong value", () => {
                assert(create("999n").validate(1000n).error).snap(
                    `"1000n is not assignable to 999n."`
                )
            })
            test("non-bigint", () => {
                assert(create("0n").validate(0).error).snap(
                    `"0 is not assignable to 0n."`
                )
            })
        })
    })
    describe("generation", () => {
        test("positive", () => {
            assert(create("1n").generate()).is(1n)
        })
        test("negative", () => {
            assert(create("-1n").generate()).is(-1n)
        })
    })
}

import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testBigintLiteral = () => {
    describe("type", () => {
        test("positive", () => {
            assert(define("999999999999999n").type).typed as bigint
        })
        test("negative", () => {
            assert(define("-1n").type).typed as bigint
        })
        describe("errors", () => {
            test("decimal", () => {
                // @ts-expect-error
                assert(() => define("99999.99n")).throwsAndHasTypeError(
                    "Unable to determine the type of '99999.99n'."
                )
            })
        })
    })
    describe("validation", () => {
        test("positive", () => {
            assert(
                // Is prime :D
                define("12345678910987654321n").validate(12345678910987654321n)
                    .errors
            ).is(undefined)
        })
        test("negative", () => {
            assert(
                define("-18446744073709551616n").validate(-BigInt(2 ** 64))
                    .errors
            ).is(undefined)
        })
        describe("errors", () => {
            test("wrong value", () => {
                assert(define("999n").validate(1000n).errors).snap(
                    `"1000 is not assignable to 999n."`
                )
            })
            test("non-bigint", () => {
                assert(define("0n").validate(0).errors).snap(
                    `"0 is not assignable to 0n."`
                )
            })
        })
    })
    describe("generation", () => {
        test("positive", () => {
            assert(define("1n").generate()).is(1n)
        })
        test("negative", () => {
            assert(define("-1n").generate()).is(-1n)
        })
    })
}

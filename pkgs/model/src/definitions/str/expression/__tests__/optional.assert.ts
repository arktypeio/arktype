import { assert } from "@re-/assert"
import { define } from "./internal.js"

export const testList = () => {
    describe("type", () => {
        test("basic", () => {
            assert(define("string[]").type).typed as string[]
        })
        test("two-dimensional", () => {
            assert(define("number[][]").type).typed as number[][]
        })
        describe("errors", () => {
            test("bad item type", () => {
                // @ts-expect-error
                assert(() => define("nonexistent[]")).throwsAndHasTypeError(
                    "Unable to determine the type of 'nonexistent'."
                )
            })
            test("unclosed bracket", () => {
                // @ts-expect-error
                assert(() => define("boolean[")).throwsAndHasTypeError(
                    "Unable to determine the type of 'boolean['."
                )
            })
            test("tuple", () => {
                // @ts-expect-error
                assert(() => define("[any]")).throwsAndHasTypeError(
                    "Unable to determine the type of '[any]'."
                )
            })
        })
    })
    describe("validation", () => {
        const numberArray = define("number[]")
        test("empty", () => {
            assert(numberArray.validate([]).errors)
        })
        test("singleton", () => {
            assert(numberArray.validate([0]).errors)
        })
        test("multiple", () => {
            assert(numberArray.validate([8, 6, 7, 5, 3, 0, 9]).errors)
        })
        describe("errors", () => {
            test("non-list", () => {
                assert(numberArray.validate({}).errors).snap()
            })
            test("bad item", () => {
                assert(numberArray.validate([1, 2, "3", 4, 5]).errors).snap()
            })
        })
    })
}

import { assert } from "@re-/assert"
import { create } from "@re-/model"
import { lazily } from "@re-/tools"

export const testList = () => {
    describe("type", () => {
        test("basic", () => {
            assert(create("string[]").type).typed as string[]
        })
        test("two-dimensional", () => {
            assert(create("number[][]").type).typed as number[][]
        })
        describe("errors", () => {
            test("bad item type", () => {
                // @ts-expect-error
                assert(() => create("nonexistent[]")).throwsAndHasTypeError(
                    "Unable to determine the type of 'nonexistent'."
                )
            })
            test("unclosed bracket", () => {
                // @ts-expect-error
                assert(() => create("boolean[")).throwsAndHasTypeError(
                    "Unable to determine the type of 'boolean['."
                )
            })
            test("tuple", () => {
                // @ts-expect-error
                assert(() => create("[any]")).throwsAndHasTypeError(
                    "Unable to determine the type of '[any]'."
                )
            })
        })
    })
    describe("validation", () => {
        const numberArray = lazily(() => create("number[]"))
        test("empty", () => {
            assert(numberArray.validate([]).errors).is(undefined)
        })
        test("singleton", () => {
            assert(numberArray.validate([0]).errors).is(undefined)
        })
        test("multiple", () => {
            assert(numberArray.validate([8, 6, 7, 5, 3, 0, 9]).errors).is(
                undefined
            )
        })
        describe("errors", () => {
            test("non-list", () => {
                assert(numberArray.validate({}).errors).snap(
                    `"{} is not assignable to number[]."`
                )
            })
            test("bad item", () => {
                assert(numberArray.validate([1, 2, "3", 4, 5]).errors).snap(
                    `"At index 2, '3' is not assignable to number."`
                )
            })
        })
    })
    describe("generation", () => {
        test("empty by default", () => {
            assert(create("number[]").generate()).equals([])
        })
    })
}

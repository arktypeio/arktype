import { assert } from "@re-/assert"
import { model } from "@re-/model"
import { lazily } from "@re-/tools"

describe("list", () => {
    describe("type", () => {
        test("basic", () => {
            assert(model("string[]").type).typed as string[]
        })
        test("two-dimensional", () => {
            assert(model("number[][]").type).typed as number[][]
        })
        describe("errors", () => {
            test("bad item type", () => {
                // @ts-expect-error
                assert(() => model("nonexistent[]")).throwsAndHasTypeError(
                    "Unable to determine the type of 'nonexistent'."
                )
            })
            test("unclosed bracket", () => {
                // @ts-expect-error
                assert(() => model("boolean[")).throwsAndHasTypeError(
                    "Unable to determine the type of 'boolean['."
                )
            })
            test("tuple", () => {
                // @ts-expect-error
                assert(() => model("[any]")).throwsAndHasTypeError(
                    "Unable to determine the type of '[any]'."
                )
            })
        })
    })
    describe("validation", () => {
        const numberArray = lazily(() => model("number[]"))
        test("empty", () => {
            assert(numberArray.validate([]).error).is(undefined)
        })
        test("singleton", () => {
            assert(numberArray.validate([0]).error).is(undefined)
        })
        test("multiple", () => {
            assert(numberArray.validate([8, 6, 7, 5, 3, 0, 9]).error).is(
                undefined
            )
        })
        describe("errors", () => {
            test("non-list", () => {
                assert(numberArray.validate({}).error).snap(
                    `"{} is not assignable to number[]."`
                )
            })
            test("bad item", () => {
                assert(numberArray.validate([1, 2, "3", 4, 5]).error).snap(
                    `"At index 2, '3' is not assignable to number."`
                )
            })
        })
    })
    describe("generation", () => {
        test("empty by default", () => {
            assert(model("number[]").generate()).equals([])
        })
    })
})

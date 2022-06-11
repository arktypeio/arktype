import { assert } from "@re-/assert"
import { eager, model } from "#api"

describe("list", () => {
    describe("type", () => {
        it("basic", () => {
            assert(model("string[]").type).typed as string[]
        })
        it("two-dimensional", () => {
            assert(model("number[][]").type).typed as number[][]
        })
        describe("errors", () => {
            it("bad item type", () => {
                // @ts-expect-error
                assert(() => eager("nonexistent[]")).throwsAndHasTypeError(
                    "Unable to determine the type of 'nonexistent'."
                )
            })
            it("unclosed bracket", () => {
                // @ts-expect-error
                assert(() => eager("boolean[")).throwsAndHasTypeError(
                    "Unable to determine the type of 'boolean['."
                )
            })
            it("tuple", () => {
                // @ts-expect-error
                assert(() => eager("[any]")).throwsAndHasTypeError(
                    "Unable to determine the type of '[any]'."
                )
            })
        })
    })
    describe("validation", () => {
        const numberArray = model("number[]")
        it("empty", () => {
            assert(numberArray.validate([]).error).is(undefined)
        })
        it("singleton", () => {
            assert(numberArray.validate([0]).error).is(undefined)
        })
        it("multiple", () => {
            assert(numberArray.validate([8, 6, 7, 5, 3, 0, 9]).error).is(
                undefined
            )
        })
        describe("errors", () => {
            it("non-list", () => {
                assert(numberArray.validate({}).error).snap(
                    `{} is not assignable to number[].`
                )
            })
            it("bad item", () => {
                assert(numberArray.validate([1, 2, "3", 4, 5]).error).snap(
                    `At index 2, '3' is not assignable to number.`
                )
            })
        })
    })
    describe("generation", () => {
        it("empty by default", () => {
            assert(model("number[]").generate()).equals([])
        })
    })
})

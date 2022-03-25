import { assert } from "@re-/assert"
import { define } from "@re-/model"
import { lazily } from "@re-/tools"

export const testList = () => {
    describe("type", () => {
        test("single-bounded", () => {
            assert(define("string>5").type).typed as string
        })
        test("double-bounded", () => {
            assert(define("-7<number<99").type).typed as string[]
        })
        describe("errors", () => {
            test("bad item type", () => {
                // @ts-expect-error
                assert(() => define("nonexistent[]")).throwsAndHasTypeError(
                    "Unable to determine the type of 'nonexistent'."
                )
            })
        })
    })
    describe("validation", () => {
        const numberArray = lazily(() => define("number[]"))
        test("empty", () => {
            assert(numberArray.validate([]).errors).is(undefined)
        })
        describe("errors", () => {
            test("non-list", () => {
                assert(numberArray.validate({}).errors).snap(
                    `"{} is not assignable to number[]."`
                )
            })
        })
    })
    describe("generation", () => {
        test("empty by default", () => {
            assert(define("number[]").generate()).equals([])
        })
    })
}

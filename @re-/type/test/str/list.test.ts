import { describe, test } from "vitest"
import { assert } from "@re-/assert"
import { type } from "../../src/index.js"

describe("list", () => {
    describe("type", () => {
        test("basic", () => {
            assert(type("string[]").infer).typed as string[]
        })
        test("two-dimensional", () => {
            assert(type("number[][]").infer).typed as number[][]
        })
        describe("errors", () => {
            test("bad item type", () => {
                // @ts-expect-error
                assert(() => type("nonexistent[]")).throwsAndHasTypeError(
                    "Unable to determine the type of 'nonexistent'."
                )
            })
            test("unclosed bracket", () => {
                // @ts-expect-error
                assert(() => type("boolean[")).throwsAndHasTypeError(
                    "Unable to determine the type of 'boolean['."
                )
            })
            test("tuple", () => {
                // @ts-expect-error
                assert(() => type("[any]")).throwsAndHasTypeError(
                    "Unable to determine the type of '[any]'."
                )
            })
        })
    })
    describe("validation", () => {
        const numberArray = type("number[]")
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
                assert(numberArray.validate({}).error?.message).snap(
                    `{} is not assignable to number[].`
                )
            })
            test("bad item", () => {
                assert(
                    numberArray.validate([1, 2, "3", 4, 5]).error?.message
                ).snap(`At index 2, "3" is not assignable to number.`)
            })
        })
    })
    describe("generation", () => {
        test("empty by default", () => {
            assert(type("number[]").create()).equals([])
        })
    })
})

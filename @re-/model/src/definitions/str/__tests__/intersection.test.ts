import { assert } from "@re-/assert"
import { model } from "@re-/model"

describe("intersection", () => {
    describe("type", () => {
        test("two types", () => {
            assert(model("boolean&true").type).typed as true
        })
        test("several types", () => {
            assert(model("unknown&boolean&false").type).typed as false
        })
        test("empty intersection", () => {
            // @ts-ignore
            assert(model("number&string").type).typed as never
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                assert(() => model("boolean&tru")).throwsAndHasTypeError(
                    "Unable to determine the type of 'tru'."
                )
            })
            test("double and", () => {
                // @ts-expect-error
                assert(() => model("boolean&&true")).throwsAndHasTypeError(
                    "Unable to determine the type of ''."
                )
            })
        })
    })
    describe("validation", () => {
        test("two types", () => {
            assert(model("boolean&true").validate(true).error).is(undefined)
        })
        test("several types", () => {
            assert(model("unknown&boolean&false").validate(false).error).is(
                undefined
            )
        })
        test("keyword specifiers", () => {
            assert(model("integer&nonnegative").validate(7).error).is(undefined)
        })
        describe("errors", () => {
            test("empty intersection", () => {
                // @ts-ignore
                assert(model("number&string").validate("5").error).snap(
                    `'5' is not assignable to all of number&string.`
                )
            })
            test("two types", () => {
                assert(model("boolean&true").validate("false").error).snap(
                    `'false' is not assignable to all of boolean&true.`
                )
            })
            test("several types", () => {
                assert(
                    model("unknown&true&boolean").validate(false).error
                ).snap(
                    `false is not assignable to all of unknown&true&boolean.`
                )
            })
            test("bad keyword specifiers", () => {
                assert(model("integer&positive").validate(7.5).error).snap(
                    `7.5 is not assignable to all of integer&positive.`
                )
            })
        })
    })
    describe("generation", () => {
        test("unsupported", () => {
            assert(() => model("boolean&true").generate()).throws.snap(
                `Unable to generate a value for 'boolean&true' (intersection generation is unsupported).`
            )
        })
    })
})

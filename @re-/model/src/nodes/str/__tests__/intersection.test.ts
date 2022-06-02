import { assert } from "@re-/assert"
import { model } from "@re-/model"

describe("intersection", () => {
    describe("type", () => {
        it("two types", () => {
            assert(model("boolean&true").type).typed as true
        })
        it("several types", () => {
            assert(model("unknown&boolean&false").type).typed as false
        })
        it("empty intersection", () => {
            // @ts-ignore
            assert(model("number&string").type).typed as never
        })
        describe("errors", () => {
            it("bad reference", () => {
                // @ts-expect-error
                assert(() => model("boolean&tru")).throwsAndHasTypeError(
                    "Unable to determine the type of 'tru'."
                )
            })
            it("double and", () => {
                // @ts-expect-error
                assert(() => model("boolean&&true")).throwsAndHasTypeError(
                    "Unable to determine the type of ''."
                )
            })
        })
    })
    describe("validation", () => {
        it("two types", () => {
            assert(model("boolean&true").validate(true).error).is(undefined)
        })
        it("several types", () => {
            assert(model("unknown&boolean&false").validate(false).error).is(
                undefined
            )
        })
        it("keyword specifiers", () => {
            assert(model("integer&nonnegative").validate(7).error).is(undefined)
        })
        describe("errors", () => {
            it("empty intersection", () => {
                // @ts-ignore
                assert(model("number&string").validate("5").error).snap(
                    `'5' is not assignable to all of number&string.`
                )
            })
            it("two types", () => {
                assert(model("boolean&true").validate("false").error).snap(
                    `'false' is not assignable to all of boolean&true.`
                )
            })
            it("several types", () => {
                assert(
                    model("unknown&true&boolean").validate(false).error
                ).snap(
                    `false is not assignable to all of unknown&true&boolean.`
                )
            })
            it("bad keyword specifiers", () => {
                assert(model("integer&positive").validate(7.5).error).snap(
                    `7.5 is not assignable to all of integer&positive.`
                )
            })
        })
    })
    describe("generation", () => {
        it("unsupported", () => {
            assert(() => model("boolean&true").generate()).throws.snap(
                `Error: Unable to generate a value for 'boolean&true' (intersection generation is unsupported).`
            )
        })
    })
})

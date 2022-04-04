import { assert } from "@re-/assert"
import { create } from "@re-/model"

export const testIntersection = () => {
    describe("type", () => {
        test("two types", () => {
            assert(create("boolean&true").type).typed as true
        })
        test("several types", () => {
            assert(create("unknown&boolean&false").type).typed as false
        })
        test("empty intersection", () => {
            // @ts-ignore
            assert(create("number&string").type).typed as never
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                assert(() => create("boolean&tru")).throwsAndHasTypeError(
                    "Unable to determine the type of 'tru'."
                )
            })
            test("double and", () => {
                // @ts-expect-error
                assert(() => create("boolean&&true")).throwsAndHasTypeError(
                    "Unable to determine the type of ''."
                )
            })
        })
    })
    describe("validation", () => {
        test("two types", () => {
            assert(create("boolean&true").validate(true).error).is(undefined)
        })
        test("several types", () => {
            assert(create("unknown&boolean&false").validate(false).error).is(
                undefined
            )
        })
        test("keyword specifiers", () => {
            assert(create("integer&nonnegative").validate(7).error).is(
                undefined
            )
        })
        describe("errors", () => {
            test("empty intersection", () => {
                // @ts-ignore
                assert(create("number&string").validate("5").error).snap(
                    `"'5' is not assignable to all of number&string."`
                )
            })
            test("two types", () => {
                assert(create("boolean&true").validate("false").error).snap(
                    `"'false' is not assignable to all of boolean&true."`
                )
            })
            test("several types", () => {
                assert(
                    create("unknown&true&boolean").validate(false).error
                ).snap(
                    `"false is not assignable to all of unknown&true&boolean."`
                )
            })
            test("bad keyword specifiers", () => {
                assert(create("integer&positive").validate(7.5).error).snap(
                    `"7.5 is not assignable to all of integer&positive."`
                )
            })
        })
    })
    describe("generation", () => {
        test("unsupported", () => {
            assert(() => create("boolean&true").generate()).throws.snap(
                `"Unable to generate a value for 'boolean&true' (intersection generation is unsupported)."`
            )
        })
    })
}

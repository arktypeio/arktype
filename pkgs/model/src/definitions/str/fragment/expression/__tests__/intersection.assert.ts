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
            assert(create("boolean&true").validate(true).errors).is(undefined)
        })
        test("several types", () => {
            assert(create("unknown&boolean&false").validate(false).errors).is(
                undefined
            )
        })
        test("keyword specifiers", () => {
            assert(create("integer&nonNegative").validate(7).errors).is(
                undefined
            )
        })
        describe("errors", () => {
            test("empty intersection", () => {
                // @ts-ignore
                assert(create("number&string").validate("5").errors).snap(`
"'5' is not assignable to all of number&string:
At path number, '5' is not assignable to number."
`)
            })
            test("two types", () => {
                assert(create("boolean&true").validate("false").errors).snap(`
"'false' is not assignable to all of boolean&true:
{boolean: ''false' is not assignable to boolean.', true: ''false' is not assignable to true.'}"
`)
            })
            test("several types", () => {
                assert(create("unknown&true&boolean").validate(false).errors)
                    .snap(`
"false is not assignable to all of unknown&true&boolean:
At path true, false is not assignable to true."
`)
            })
            test("bad keyword specifiers", () => {
                assert(create("integer&positive").validate(7.5).errors).snap(`
"7.5 is not assignable to all of integer&positive:
At path integer, 7.5 is not assignable to integer."
`)
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

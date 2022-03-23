import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testOptional = () => {
    describe("type", () => {
        test("adds undefined to standalone type", () => {
            assert(define("string?").type).typed as string | undefined
        })
        test("adds undefined to in-object type and makes it optional", () => {
            assert(
                define({
                    required: "boolean",
                    optional: "boolean?"
                }).type
            ).typed as {
                optional?: boolean | undefined
                required: boolean
            }
        })
        describe("errors", () => {
            test("bad inner type", () => {
                // @ts-expect-error
                assert(() => define("nonexistent?")).throwsAndHasTypeError(
                    "Unable to determine the type of 'nonexistent'."
                )
            })
            test("multiple consecutive", () => {
                // @ts-expect-error
                assert(() => define("boolean??")).throwsAndHasTypeError(
                    "Modifier '?' cannot appear more than once in a string definition."
                )
            })
            test("multiple non-consecutive", () => {
                assert(() =>
                    define({
                        a: "string",
                        // @ts-expect-error
                        b: "number?|string?"
                    })
                ).throwsAndHasTypeError(
                    "Modifier '?' is only valid at the end of a type definition."
                )
            })
            test("within expression", () => {
                assert(() =>
                    // @ts-expect-error
                    define("boolean?|string|number")
                ).throwsAndHasTypeError(
                    "Modifier '?' is only valid at the end of a type definition."
                )
            })
        })
    })
    describe("validation", () => {
        test("preserves original type", () => {
            assert(define("false?").validate(false).errors).is(undefined)
        })
        test("allows undefined", () => {
            assert(define("false?").validate(undefined).errors).is(undefined)
        })
        test("allows omission of key", () => {
            assert(
                define({
                    required: "string",
                    optional: "string?"
                }).validate({ required: "" }).errors
            ).is(undefined)
        })
        describe("errors", () => {
            test("bad inner type", () => {
                assert(define("true?").validate(false).errors).snap(
                    `"false is not assignable to true."`
                )
            })
        })
    })
    describe("generation", () => {
        test("standalone is undefined by default", () => {
            assert(define("null?").generate()).is(undefined)
        })
        test("optional key is omitted by default", () => {
            assert(
                define({ required: "string", optional: "string?" }).generate()
            ).equals({ required: "" })
        })
    })
}

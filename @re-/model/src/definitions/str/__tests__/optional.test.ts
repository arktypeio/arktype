import { assert } from "@re-/assert"
import { model } from "@re-/model"

describe("optional", () => {
    describe("type", () => {
        test("adds undefined to standalone type", () => {
            assert(model("string?").type).typed as string | undefined
        })
        test("adds undefined to in-object type and makes it optional", () => {
            assert(
                model({
                    required: "boolean",
                    optional: "boolean?"
                }).type
            ).typed as {
                required: boolean
                optional?: boolean | undefined
            }
        })
        describe("errors", () => {
            test("bad inner type", () => {
                // @ts-expect-error
                assert(() => model("nonexistent?")).throwsAndHasTypeError(
                    "Unable to determine the type of 'nonexistent'."
                )
            })
            test("multiple consecutive", () => {
                // @ts-expect-error
                assert(() => model("boolean??")).throwsAndHasTypeError(
                    "Modifier '?' is only valid at the end of a type definition."
                )
            })
            test("multiple non-consecutive", () => {
                assert(() =>
                    model({
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
                    model("boolean?|string|number")
                ).throwsAndHasTypeError(
                    "Modifier '?' is only valid at the end of a type definition."
                )
            })
        })
    })
    describe("validation", () => {
        test("preserves original type", () => {
            assert(model("false?").validate(false).error).is(undefined)
        })
        test("allows undefined", () => {
            assert(model("false?").validate(undefined).error).is(undefined)
        })
        test("allows omission of key", () => {
            assert(
                model({
                    required: "string",
                    optional: "string?"
                }).validate({ required: "" }).error
            ).is(undefined)
        })
        describe("errors", () => {
            test("bad inner type", () => {
                assert(model("true?").validate(false).error).snap(
                    `false is not assignable to true.`
                )
            })
        })
    })
    describe("generation", () => {
        test("standalone is undefined by default", () => {
            assert(model("null?").generate()).is(undefined)
        })
        test("optional key is omitted by default", () => {
            assert(
                model({ required: "string", optional: "string?" }).generate()
            ).equals({ required: "" })
        })
    })
})

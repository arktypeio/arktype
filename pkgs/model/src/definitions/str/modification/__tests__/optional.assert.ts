import { assert } from "@re-/assert"
import { create } from "@re-/model"

export const testOptional = () => {
    describe("type", () => {
        test("adds undefined to standalone type", () => {
            assert(create("string?").type).typed as string | undefined
        })
        test("adds undefined to in-object type and makes it optional", () => {
            assert(
                create({
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
                assert(() => create("nonexistent?")).throwsAndHasTypeError(
                    "Unable to determine the type of 'nonexistent'."
                )
            })
            test("multiple consecutive", () => {
                // @ts-expect-error
                assert(() => create("boolean??")).throwsAndHasTypeError(
                    "Modifier '?' cannot appear more than once in a string definition."
                )
            })
            test("multiple non-consecutive", () => {
                assert(() =>
                    create({
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
                    create("boolean?|string|number")
                ).throwsAndHasTypeError(
                    "Modifier '?' is only valid at the end of a type definition."
                )
            })
        })
    })
    describe("validation", () => {
        test("preserves original type", () => {
            assert(create("false?").validate(false).error).is(undefined)
        })
        test("allows undefined", () => {
            assert(create("false?").validate(undefined).error).is(undefined)
        })
        test("allows omission of key", () => {
            assert(
                create({
                    required: "string",
                    optional: "string?"
                }).validate({ required: "" }).error
            ).is(undefined)
        })
        describe("errors", () => {
            test("bad inner type", () => {
                assert(create("true?").validate(false).error).snap(
                    `"false is not assignable to true."`
                )
            })
        })
    })
    describe("generation", () => {
        test("standalone is undefined by default", () => {
            assert(create("null?").generate()).is(undefined)
        })
        test("optional key is omitted by default", () => {
            assert(
                create({ required: "string", optional: "string?" }).generate()
            ).equals({ required: "" })
        })
    })
}

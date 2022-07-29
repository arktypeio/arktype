import { assert } from "@re-/assert"
import { describe, test } from "vitest"
import { type } from "../../../index.js"

describe("optional", () => {
    describe("type", () => {
        test("adds undefined to standalone type", () => {
            assert(type("string?").infer).typed as string | undefined
        })
        test("adds undefined to in-object type and makes it optional", () => {
            assert(
                type({
                    required: "boolean",
                    optional: "boolean?"
                }).infer
            ).typed as {
                required: boolean
                optional?: boolean | undefined
            }
        })

        describe("errors", () => {
            test("bad inner type", () => {
                // @ts-expect-error
                assert(() => type("nonexistent?")).throwsAndHasTypeError(
                    "Unable to determine the type of 'nonexistent'."
                )
            })
            test("multiple consecutive", () => {
                // @ts-expect-error
                assert(() => type("boolean??")).throwsAndHasTypeError(
                    "Modifier '?' is only valid at the end of a type definition."
                )
            })
            test("multiple non-consecutive", () => {
                assert(() =>
                    type({
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
                    type("boolean?|string|number")
                ).throwsAndHasTypeError(
                    "Modifier '?' is only valid at the end of a type definition."
                )
            })
        })
    })

    describe("validation", () => {
        test("preserves original type", () => {
            assert(type("false?").validate(false).error).is(undefined)
        })
        test("allows undefined", () => {
            assert(type("false?").validate(undefined).error).is(undefined)
        })
        test("allows omission of key", () => {
            assert(
                type({
                    required: "string",
                    optional: "string?"
                }).validate({ required: "" }).error
            ).is(undefined)
        })
        describe("errors", () => {
            test("bad inner type", () => {
                assert(type("true?").validate(false).error?.message).snap(
                    `false is not assignable to true.`
                )
            })
        })
    })
    describe("generation", () => {
        test("standalone is undefined by default", () => {
            assert(type("null?").create()).is(undefined)
        })
        test("optional key is omitted by default", () => {
            assert(
                type({ required: "string", optional: "string?" }).create()
            ).equals({ required: "" })
        })
    })
})

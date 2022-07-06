import { assert } from "@re-/assert"
import { eager, model } from "../../src/index.js"

describe("optional", () => {
    describe("type", () => {
        it("adds undefined to standalone type", () => {
            assert(model("string?").type).typed as string | undefined
        })
        it("adds undefined to in-object type and makes it optional", () => {
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
            it("bad inner type", () => {
                // @ts-expect-error
                assert(() => eager("nonexistent?")).throwsAndHasTypeError(
                    "Unable to determine the type of 'nonexistent'."
                )
            })
            it("multiple consecutive", () => {
                // @ts-expect-error
                assert(() => eager("boolean??")).throwsAndHasTypeError(
                    "Modifier '?' is only valid at the end of a type definition."
                )
            })
            it("multiple non-consecutive", () => {
                assert(() =>
                    eager({
                        a: "string",
                        // @ts-expect-error
                        b: "number?|string?"
                    })
                ).throwsAndHasTypeError(
                    "Modifier '?' is only valid at the end of a type definition."
                )
            })
            it("within expression", () => {
                assert(() =>
                    // @ts-expect-error
                    eager("boolean?|string|number")
                ).throwsAndHasTypeError(
                    "Modifier '?' is only valid at the end of a type definition."
                )
            })
        })
    })
    describe("validation", () => {
        it("preserves original type", () => {
            assert(model("false?").validate(false).error).is(undefined)
        })
        it("allows undefined", () => {
            assert(model("false?").validate(undefined).error).is(undefined)
        })
        it("allows omission of key", () => {
            assert(
                model({
                    required: "string",
                    optional: "string?"
                }).validate({ required: "" }).error
            ).is(undefined)
        })
        describe("errors", () => {
            it("bad inner type", () => {
                assert(model("true?").validate(false).error?.message).snap(
                    `false is not assignable to true.`
                )
            })
        })
    })
    describe("generation", () => {
        it("standalone is undefined by default", () => {
            assert(model("null?").create()).is(undefined)
        })
        it("optional key is omitted by default", () => {
            assert(
                model({ required: "string", optional: "string?" }).create()
            ).equals({ required: "" })
        })
    })
})

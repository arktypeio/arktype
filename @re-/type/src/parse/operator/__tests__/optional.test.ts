import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../index.js"
import { nonTerminatingOptionalMessage } from "../optional.js"

describe("optional", () => {
    describe("type", () => {
        test("adds undefined to standalone type", () => {
            assert(type("string?").infer).typed as string | undefined
        })
        test("adds undefined to non terminal", () => {
            assert(type("(string|number[])?").infer).typed as
                | string
                | number[]
                | undefined
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
                    "'nonexistent' is not a builtin type and does not exist in your space."
                )
            })
            test("multiple consecutive", () => {
                // @ts-expect-error
                assert(() => type("boolean??")).throwsAndHasTypeError(
                    nonTerminatingOptionalMessage
                )
            })
            test("multiple non-consecutive", () => {
                assert(() =>
                    type({
                        a: "string",
                        // @ts-expect-error
                        b: "number?|string?"
                    })
                ).throwsAndHasTypeError(nonTerminatingOptionalMessage)
            })
        })
    })

    describe("validation", () => {
        test("preserves original type", () => {
            assert(type("false?").check(false).errors).is(undefined)
        })
        test("allows undefined", () => {
            assert(type("false?").check(undefined).errors).is(undefined)
        })
        test("allows omission of key", () => {
            assert(
                type({
                    required: "string",
                    optional: "string?"
                }).check({ required: "" }).errors
            ).is(undefined)
        })
        describe("errors", () => {
            test("bad inner type", () => {
                assert(type("true?").check(false).errors?.summary).snap(
                    `Must be true (got false).`
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

import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../index.js"

describe("optional node", () => {
    test("infer", () => {
        assert(type("string?").infer).typed as string | undefined
    })
    describe("check", () => {
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
                    `Must be true (was false)`
                )
            })
        })
    })
    describe("generate", () => {
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

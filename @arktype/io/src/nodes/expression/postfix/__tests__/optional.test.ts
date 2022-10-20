import { assert } from "@arktype/assert"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"

describe("optional node", () => {
    test("infer", () => {
        assert(type("string?").infer).typed as string | undefined
    })
    describe("check", () => {
        test("preserves original type", () => {
            assert(type("false?").check(false).problems).is(undefined)
        })
        test("allows undefined", () => {
            assert(type("false?").check(undefined).problems).is(undefined)
        })
        test("allows omission of key", () => {
            assert(
                type({
                    required: "string",
                    optional: "string?"
                }).check({ required: "" }).problems
            ).is(undefined)
        })
        describe("errors", () => {
            test("bad inner type", () => {
                assert(type("true?").check(false).problems?.summary).snap(
                    `Must be true (was false)`
                )
            })
        })
    })
})

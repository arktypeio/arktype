import { assert } from "@arktype/assert"
import { describe, test } from "mocha"
import { type } from "../../../api.js"

describe("array node", () => {
    test("infer", () => {
        assert(type("boolean[]").infer).typed as boolean[]
    })
    describe("check", () => {
        test("empty", () => {
            assert(type("string[]").check([]).errors).is(undefined)
        })
        test("non-empty", () => {
            assert(type("boolean[]").check([true, false]).errors).is(undefined)
        })

        describe("errors", () => {
            test("non-array", () => {
                assert(type("any[]").check({}).errors?.summary).snap(
                    "Must be an array (was object)"
                )
            })
            test("bad item", () => {
                assert(
                    type("string[]").check(["one", "two", 3, "four", "five"])
                        .errors?.summary
                ).snap(`Value at index 2 must be a string (was number)`)
            })
        })
    })
})

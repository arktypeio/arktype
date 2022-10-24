import { assert } from "#testing"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"

describe("array node", () => {
    test("infer", () => {
        assert(type("boolean[]").infer).typed as boolean[]
    })
    describe("check", () => {
        test("empty", () => {
            assert(type("string[]").check([]).problems).is(undefined)
        })
        test("non-empty", () => {
            assert(type("boolean[]").check([true, false]).problems).is(
                undefined
            )
        })

        describe("errors", () => {
            test("non-array", () => {
                assert(type("any[]").check({}).problems?.summary).snap(
                    "Must be an array (was object)"
                )
            })
            test("bad item", () => {
                assert(
                    type("string[]").check(["one", "two", 3, "four", "five"])
                        .problems?.summary
                ).snap(`Value at index 2 must be a string (was number)`)
            })
        })
    })
})

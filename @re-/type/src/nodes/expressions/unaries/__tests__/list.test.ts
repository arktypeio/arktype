import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../index.js"

describe("list node", () => {
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
            test("non-list", () => {
                assert(type("any[]").check({}).errors?.summary).snap(
                    `Must be an array.`
                )
            })
            test("bad item", () => {
                assert(
                    type("string[]").check(["one", "two", 3, "four", "five"])
                        .errors?.summary
                ).snap(`Item 2 must be a string.`)
            })
        })
    })
    describe("generate", () => {
        test("empty by default", () => {
            assert(type("unknown[]").create()).equals([])
        })
    })
})

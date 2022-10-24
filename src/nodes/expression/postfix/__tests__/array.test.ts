import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"

describe("array node", () => {
    test("infer", () => {
        attest(type("boolean[]").infer).typed as boolean[]
    })
    describe("check", () => {
        test("empty", () => {
            attest(type("string[]").check([]).problems).is(undefined)
        })
        test("non-empty", () => {
            attest(type("boolean[]").check([true, false]).problems).is(
                undefined
            )
        })

        describe("errors", () => {
            test("non-array", () => {
                attest(type("any[]").check({}).problems?.summary).snap(
                    "Must be an array (was object)"
                )
            })
            test("bad item", () => {
                attest(
                    type("string[]").check(["one", "two", 3, "four", "five"])
                        .problems?.summary
                ).snap(`Value at index 2 must be a string (was number)`)
            })
        })
    })
})

import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"

describe("optional node", () => {
    test("infer", () => {
        attest(type("string?").infer).typed as string | undefined
    })
    describe("check", () => {
        test("preserves original type", () => {
            attest(type("false?").check(false).problems).is(undefined)
        })
        test("allows undefined", () => {
            attest(type("false?").check(undefined).problems).is(undefined)
        })
        test("allows omission of key", () => {
            attest(
                type({
                    required: "string",
                    optional: "string?"
                }).check({ required: "" }).problems
            ).is(undefined)
        })
        describe("errors", () => {
            test("bad inner type", () => {
                attest(type("true?").check(false).problems?.summary).snap(
                    `Must be true (was false)`
                )
            })
        })
    })
})

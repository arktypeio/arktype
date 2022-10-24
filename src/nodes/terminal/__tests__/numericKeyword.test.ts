import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../type.js"

describe("constrained keyword", () => {
    test("integer", () => {
        const integer = type("integer")
        attest(integer.infer).typed as number
        attest(integer.check(5).problems).is(undefined)
        attest(integer.check(5.0001).problems?.summary).snap(
            `Must be an integer (was 5.0001)`
        )
        attest(integer.check(Infinity).problems?.summary).snap(
            `Must be an integer (was Infinity)`
        )
        attest(integer.check(NaN).problems?.summary).snap(
            `Must be an integer (was NaN)`
        )
    })
})

import { assert } from "#testing"
import { describe, test } from "mocha"
import { type } from "../../../type.js"

describe("constrained keyword", () => {
    test("integer", () => {
        const integer = type("integer")
        assert(integer.infer).typed as number
        assert(integer.check(5).problems).is(undefined)
        assert(integer.check(5.0001).problems?.summary).snap(
            `Must be an integer (was 5.0001)`
        )
        assert(integer.check(Infinity).problems?.summary).snap(
            `Must be an integer (was Infinity)`
        )
        assert(integer.check(NaN).problems?.summary).snap(
            `Must be an integer (was NaN)`
        )
    })
})

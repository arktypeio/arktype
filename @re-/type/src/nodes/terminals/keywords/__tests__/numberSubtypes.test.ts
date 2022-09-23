import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../type.js"

describe("number subtypes", () => {
    test("integer", () => {
        const integer = type("integer")
        assert(integer.infer).typed as number
        assert(integer.check(5).errors).is(undefined)
        assert(integer.check(5.0001).errors?.summary).snap(
            `Must be an integer (was 5.0001).`
        )
        assert(integer.check(Infinity).errors?.summary).snap(
            `Must be an integer (was Infinity).`
        )
        assert(integer.check(NaN).errors?.summary).snap(
            `Must be an integer (was NaN).`
        )
    })
})

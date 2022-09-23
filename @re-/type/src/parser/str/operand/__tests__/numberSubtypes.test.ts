import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../type.js"

describe("number-typed", () => {
    describe("number subtypes", () => {
        test("integer", () => {
            const integer = type("integer")
            assert(integer.infer).typed as number
            assert(integer.check(5).errors).is(undefined)
            assert(integer.check(5.0001).errors?.summary).snap(
                `'5.0001' must must be an integer.`
            )
            assert(integer.check(Infinity).errors?.summary).snap(
                `'Infinity' must must be an integer.`
            )
            assert(integer.check(NaN).errors?.summary).snap(
                `'NaN' must must be an integer.`
            )
        })
    })
})

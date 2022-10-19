import { assert } from "@arktype/assert"
import { describe, test } from "mocha"
import { type } from "../../../api.js"

describe("intersection node", () => {
    test("infer", () => {
        assert(type("boolean&true").infer).typed as true
        assert(type("number&1&unknown").infer).typed as 1
        assert(type("true&false").infer).typed as never
    })
    describe("check", () => {
        test("two types", () => {
            const numberInteger = type("number&integer")
            assert(numberInteger.check(100).errors).equals(undefined)
            assert(numberInteger.check(99.9).errors?.summary).snap(
                `Must be an integer (was 99.9)`
            )
        })
        test("several types", () => {
            const unknownBooleanFalse = type("unknown&boolean&false")
            assert(unknownBooleanFalse.check(false).errors).equals(undefined)
            assert(unknownBooleanFalse.check("false").errors?.summary)
                .snap(`/: Must be boolean (was string)
/: Must be false (was "false")`)
        })
    })
})

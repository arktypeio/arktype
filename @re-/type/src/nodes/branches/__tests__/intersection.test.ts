import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../index.js"

describe("intersection node", () => {
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
                .snap(`Encountered errors at the following paths:
  /: Must be boolean (was string)
  /: Must be false (was "false")
`)
        })
    })
    describe("generate", () => {
        test("unsupported", () => {
            assert(() => type("boolean&true").create()).throws.snap(
                `Error: Unable to generate a value for 'boolean&true': Intersection generation is unsupported.`
            )
        })
    })
})

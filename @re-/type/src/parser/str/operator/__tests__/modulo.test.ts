import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { DivisibilityOperator } from "../divisibility.js"

describe("modulo", () => {
    describe("valid", () => {
        test("integerLiteralDefinition", () => {
            assert(type("number%2").ast).narrowedValue(["number", "%", "2"])
        })
    })
    describe("invalid", () => {
        test("indivisible", () => {
            // @ts-expect-error
            assert(() => type("string%2")).throwsAndHasTypeError(
                DivisibilityOperator.buildIndivisibleMessage("string")
            )
        })
        test("non-integer divisor", () => {
            // @ts-expect-error
            assert(() => type("number%2.3")).throwsAndHasTypeError(
                DivisibilityOperator.buildInvalidDivisorMessage("2.3")
            )
        })
        test("non-numeric divisor", () => {
            // @ts-expect-error
            assert(() => type("number%foobar")).throwsAndHasTypeError(
                DivisibilityOperator.buildInvalidDivisorMessage("foobar")
            )
        })
        test("zero divisor", () => {
            // @ts-expect-error
            assert(() => type("number%0")).throwsAndHasTypeError(
                DivisibilityOperator.buildInvalidDivisorMessage("0")
            )
        })
    })
})

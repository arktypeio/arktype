import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../../api.js"
import { indivisibleMessage, invalidDivisorMessage } from "../modulo.js"

describe("modulo", () => {
    describe("valid", () => {
        test("integerLiteralDefinition", () => {
            assert(type("number%2").ast).narrowedValue([
                "number",
                ":",
                [["%", 2]]
            ])
        })
    })
    describe("invalid", () => {
        test("indivisible", () => {
            // @ts-expect-error
            assert(() => type("string%2")).throwsAndHasTypeError(
                indivisibleMessage("string")
            )
        })
        test("non-integer divisor", () => {
            // @ts-expect-error
            assert(() => type("number%2.3")).throwsAndHasTypeError(
                invalidDivisorMessage("2.3")
            )
        })
        test("non-numeric divisor", () => {
            // @ts-expect-error
            assert(() => type("number%foobar")).throwsAndHasTypeError(
                invalidDivisorMessage("foobar")
            )
        })
        test("zero divisor", () => {
            // @ts-expect-error
            assert(() => type("number%0")).throwsAndHasTypeError(
                invalidDivisorMessage("0")
            )
        })
    })

    describe("generation", () => {
        test("unsupported", () => {
            assert(() => type("number%5").generate()).throws.snap(
                `Error: Unable to generate a value for 'number%5': Constrained generation is not yet supported.`
            )
        })
    })
})

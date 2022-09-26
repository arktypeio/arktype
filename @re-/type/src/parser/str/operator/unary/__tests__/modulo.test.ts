import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../../api.js"
import { invalidSuffixMessage } from "../../../state/scanner.js"
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
        test("moduloByZero", () => {
            // @ts-expect-error
            assert(() => type("number%0")).throwsAndHasTypeError(
                invalidDivisorMessage("0")
            )
        })
        test("unexpectedSuffix", () => {
            // @ts-expect-error
            assert(() => type("number%foobar")).throwsAndHasTypeError(
                invalidSuffixMessage("%", "foobar", "an integer literal")
            )
        })
        test("indivisible", () => {
            // @ts-expect-error
            assert(() => type("string%2")).throwsAndHasTypeError(
                indivisibleMessage("string")
            )
        })
        test("non-integer", () => {
            // @ts-expect-error
            assert(() => type("number%2.3")).throwsAndHasTypeError(
                invalidSuffixMessage("%", "2.3", "an integer literal")
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

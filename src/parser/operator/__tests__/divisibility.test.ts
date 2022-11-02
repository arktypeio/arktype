import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../api.js"
import { DivisibilityOperator } from "../divisibility.js"

describe("divisibility", () => {
    describe("parse", () => {
        describe("valid", () => {
            test("integerLiteralDefinition", () => {
                const divisibleByTwo = type("number%2")
                attest(divisibleByTwo.attributes).equals({
                    type: "number",
                    divisor: 2
                })
                attest(divisibleByTwo.infer).typed as number
            })
        })
        describe("invalid", () => {
            test("non-integer divisor", () => {
                // @ts-expect-error
                attest(() => type("number%2.3")).throwsAndHasTypeError(
                    DivisibilityOperator.buildInvalidDivisorMessage("2.3")
                )
            })
            test("non-numeric divisor", () => {
                // @ts-expect-error
                attest(() => type("number%foobar")).throwsAndHasTypeError(
                    DivisibilityOperator.buildInvalidDivisorMessage("foobar")
                )
            })
            test("zero divisor", () => {
                // @ts-expect-error
                attest(() => type("number%0")).throwsAndHasTypeError(
                    DivisibilityOperator.buildInvalidDivisorMessage(0)
                )
            })
        })
    })
})

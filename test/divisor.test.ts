import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import { buildInvalidDivisorMessage } from "../src/parse/shift/operator/divisor.js"

describe("divisibility", () => {
    describe("parse", () => {
        describe("valid", () => {
            test("integerLiteralDefinition", () => {
                const divisibleByTwo = type("number%2")
                attest(divisibleByTwo.root).equals({
                    number: {
                        divisor: 2
                    }
                })
                attest(divisibleByTwo.infer).typed as number
            })
        })
        describe("invalid", () => {
            test("non-integer divisor", () => {
                // @ts-expect-error
                attest(() => type("number%2.3")).throwsAndHasTypeError(
                    buildInvalidDivisorMessage("2.3")
                )
            })
            test("non-numeric divisor", () => {
                // @ts-expect-error
                attest(() => type("number%foobar")).throwsAndHasTypeError(
                    buildInvalidDivisorMessage("foobar")
                )
            })
            test("zero divisor", () => {
                // @ts-expect-error
                attest(() => type("number%0")).throwsAndHasTypeError(
                    buildInvalidDivisorMessage(0)
                )
            })
        })
    })
})

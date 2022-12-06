import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import { buildInvalidDivisorMessage } from "../src/parse/shift/operator/divisor.js"

describe("divisibility", () => {
    describe("parse", () => {
        describe("intersection", () => {
            test("number type & divisor", () => {
                attest(type("number%3&8").root).snap({
                    type: "number",
                    literal: 8
                })
            })
            test("bound & divisor", () => {
                attest(type("number<3&number%8").root).snap({
                    type: "number",
                    bounds: { max: { limit: 3, exclusive: true } },
                    divisor: 8
                })
            })
        })
        describe("valid", () => {
            test("integerLiteralDefinition", () => {
                const divisibleByTwo = type("number%2")
                attest(divisibleByTwo.root).equals({
                    type: "number",
                    divisor: 2
                })
                attest(divisibleByTwo.infer).typed as number
            })
            test("whitespace after modulo", () => {
                attest(type("number % 5").infer).typed as number
            })
            test("GCD", () => {
                attest(type("number%2&number%3").root).snap({
                    type: "number",
                    divisor: 6
                })
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

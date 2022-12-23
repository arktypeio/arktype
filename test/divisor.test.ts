import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.ts"
import { type } from "../exports.ts"
import { buildInvalidDivisorMessage } from "../src/parse/string/shift/operator/divisor.ts"

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
            test("whitespace after modulo", () => {
                attest(type("number % 5").infer).typed as number
            })
            test("with bound", () => {
                attest(type("number<3&number%8").root).snap({
                    number: {
                        range: { max: { limit: 3, exclusive: true } },
                        divisor: 8
                    }
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
    describe("intersection", () => {
        test("identical", () => {
            attest(type("number%2&number%2").root).snap({
                number: { divisor: 2 }
            })
        })
        test("purely divisible", () => {
            attest(type("number%4&number%2").root).snap({
                number: { divisor: 4 }
            })
        })
        test("common divisor", () => {
            attest(type("number%6&number%4").root).snap({
                number: { divisor: 12 }
            })
        })
        test("relatively prime", () => {
            attest(type("number%2&number%3").root).snap({
                number: { divisor: 6 }
            })
        })
        test("valid literal", () => {
            attest(type("number%5&0").root).snap({ number: { value: 0 } })
        })
        test("invalid literal", () => {
            attest(type("number%3&8").root).snap({ number: [] })
        })
    })
})

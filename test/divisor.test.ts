import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { buildInvalidDivisorMessage } from "../src/parse/string/shift/operator/divisor.ts"

describe("divisibility", () => {
    describe("parse", () => {
        describe("valid", () => {
            it("integerLiteralDefinition", () => {
                const divisibleByTwo = type("number%2")
                attest(divisibleByTwo.node).equals({
                    number: {
                        divisor: 2
                    }
                })
                attest(divisibleByTwo.infer).typed as number
            })
            it("whitespace after modulo", () => {
                attest(type("number % 5").infer).typed as number
            })
            it("with bound", () => {
                attest(type("number<3&number%8").node).snap({
                    number: {
                        range: { max: { limit: 3, exclusive: true } },
                        divisor: 8
                    }
                })
            })
        })
        describe("invalid", () => {
            it("non-integer divisor", () => {
                // @ts-expect-error
                attest(() => type("number%2.3")).throwsAndHasTypeError(
                    buildInvalidDivisorMessage("2.3")
                )
            })
            it("non-numeric divisor", () => {
                // @ts-expect-error
                attest(() => type("number%foobar")).throwsAndHasTypeError(
                    buildInvalidDivisorMessage("foobar")
                )
            })
            it("zero divisor", () => {
                // @ts-expect-error
                attest(() => type("number%0")).throwsAndHasTypeError(
                    buildInvalidDivisorMessage(0)
                )
            })
        })
    })
    describe("intersection", () => {
        it("identical", () => {
            attest(type("number%2&number%2").node).snap({
                number: { divisor: 2 }
            })
        })
        it("purely divisible", () => {
            attest(type("number%4&number%2").node).snap({
                number: { divisor: 4 }
            })
        })
        it("common divisor", () => {
            attest(type("number%6&number%4").node).snap({
                number: { divisor: 12 }
            })
        })
        it("relatively prime", () => {
            attest(type("number%2&number%3").node).snap({
                number: { divisor: 6 }
            })
        })
        it("valid literal", () => {
            attest(type("number%5&0").node).snap({ number: { value: 0 } })
        })
        it("invalid literal", () => {
            attest(type("number%3&8").node).snap({ number: [] })
        })
    })
})

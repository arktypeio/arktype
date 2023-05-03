import { describe, it } from "vitest"
import { type } from "../../src/main.js"
import { writeIndivisibleMessage } from "../../src/parse/ast/divisor.js"
import { writeInvalidDivisorMessage } from "../../src/parse/string/shift/operator/divisor.js"
import { attest } from "../attest/main.js"

describe("divisibility", () => {
    describe("parse", () => {
        it("integerLiteralDefinition", () => {
            const divisibleByTwo = type("number%2")
            // attest(divisibleByTwo.node).equals({
            //     number: {
            //         divisor: 2
            //     }
            // })
            attest(divisibleByTwo.infer).typed as number
        })
        it("whitespace after modulo", () => {
            attest(type("number % 5").infer).typed as number
        })
        it("with bound", () => {
            const t = type("number<3&number%8")
            // attest(t.node).snap({
            //     number: {
            //         range: { max: { limit: 3, comparator: "<" } },
            //         divisor: 8
            //     }
            // })
        })
        it("allows non-narrowed divisor", () => {
            const z = 5 as number
            attest(type(`number%${z}`).infer).typed as number
        })
        it("fails at runtime on non-integer divisor", () => {
            attest(() => type("number%2.3")).throws(
                writeInvalidDivisorMessage("2.3")
            )
        })
        it("non-numeric divisor", () => {
            // @ts-expect-error
            attest(() => type("number%foobar")).throwsAndHasTypeError(
                writeInvalidDivisorMessage("foobar")
            )
        })
        it("zero divisor", () => {
            // @ts-expect-error
            attest(() => type("number%0")).throwsAndHasTypeError(
                writeInvalidDivisorMessage(0)
            )
        })
        it("indivisible unknown", () => {
            // @ts-expect-error
            attest(() => type("unknown%2")).throwsAndHasTypeError(
                writeIndivisibleMessage("'unknown'")
            )
        })
        it("indivisible any", () => {
            // @ts-expect-error
            attest(() => type("any%1")).throwsAndHasTypeError(
                writeIndivisibleMessage("'any'")
            )
        })
        it("overlapping", () => {
            // @ts-expect-error
            attest(() => type("(number|string)%10")).throws.snap(
                'Error: Divisibility operand {"number":true,"string":true} must be a number'
            )
        })
    })
    describe("intersection", () => {
        it("identical", () => {
            const t = type("number%2&number%2")
            // attest(t.node).snap({
            //     number: { divisor: 2 }
            // })
        })
        it("purely divisible", () => {
            const t = type("number%4&number%2")
            // attest(t.node).snap({
            //     number: { divisor: 4 }
            // })
        })
        it("common divisor", () => {
            const t = type("number%6&number%4")
            // attest(t.node).snap({
            //     number: { divisor: 12 }
            // })
        })
        it("relatively prime", () => {
            const t = type("number%2&number%3")
            // attest(t.node).snap({
            //     number: { divisor: 6 }
            // })
        })
        it("valid literal", () => {
            const t = type("number%5&0")
            // attest(t.node).snap({ number: { value: 0 } })
        })
        it("invalid literal", () => {
            attest(() => type("number%3&8")).throws.snap(
                'Error: Intersection of literal value 8 and {"divisor":3} results in an unsatisfiable type'
            )
        })
    })
})

import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { writeIndivisibleMessage } from "../../src/parse/ast/divisor.js"
import { writeInvalidDivisorMessage } from "../../src/parse/string/shift/operator/divisor.js"
import { attest } from "../attest/main.js"

suite("divisibility", () => {
    suite("parse", () => {
        test("integerLiteralDefinition", () => {
            const divisibleByTwo = type("number%2")
            // attest(divisibleByTwo.node).equals({
            //     number: {
            //         divisor: 2
            //     }
            // })
            attest(divisibleByTwo.infer).typed as number
        })
        test("whitespace after modulo", () => {
            attest(type("number % 5").infer).typed as number
        })
        test("with bound", () => {
            const t = type("number<3&number%8")
            // attest(t.node).snap({
            //     number: {
            //         range: { max: { limit: 3, comparator: "<" } },
            //         divisor: 8
            //     }
            // })
        })
        test("allows non-narrowed divisor", () => {
            const z = 5 as number
            attest(type(`number%${z}`).infer).typed as number
        })
        test("fails at runtime on non-integer divisor", () => {
            attest(() => type("number%2.3")).throws(
                writeInvalidDivisorMessage("2.3")
            )
        })
        test("non-numeric divisor", () => {
            // @ts-expect-error
            attest(() => type("number%foobar")).throwsAndHasTypeError(
                writeInvalidDivisorMessage("foobar")
            )
        })
        test("zero divisor", () => {
            // @ts-expect-error
            attest(() => type("number%0")).throwsAndHasTypeError(
                writeInvalidDivisorMessage(0)
            )
        })
        test("unknown", () => {
            // @ts-expect-error
            attest(() => type("unknown%2")).throwsAndHasTypeError(
                writeIndivisibleMessage("unknown")
            )
        })
        test("indivisible", () => {
            // @ts-expect-error
            attest(() => type("string%1")).throwsAndHasTypeError(
                writeIndivisibleMessage("string")
            )
        })
        test("overlapping", () => {
            // @ts-expect-error
            attest(() => type("(number|string)%10"))
                .throws("Divisibility operand string must be a number")
                .types.errors(
                    "Divisibility operand number | string must be a number"
                )
        })
    })
    suite("intersection", () => {
        test("identical", () => {
            const t = type("number%2&number%2")
            // attest(t.node).snap({
            //     number: { divisor: 2 }
            // })
        })
        test("purely divisible", () => {
            const t = type("number%4&number%2")
            // attest(t.node).snap({
            //     number: { divisor: 4 }
            // })
        })
        test("common divisor", () => {
            const t = type("number%6&number%4")
            // attest(t.node).snap({
            //     number: { divisor: 12 }
            // })
        })
        test("relatively prime", () => {
            const t = type("number%2&number%3")
            attest(t.root.rule).snap(
                'typeof $arkRoot === "number" && $arkRoot % 6 === 0'
            )
            // attest(t.node).snap({
            //     number: { divisor: 6 }
            // })
        })
        test("valid literal", () => {
            const t = type("number%5&0")
            // attest(t.node).snap({ number: { value: 0 } })
        })
        test("invalid literal", () => {
            attest(() => type("number%3&8")).throws(
                "Intersection of a multiple of 3 and the value 8 results in an unsatisfiable type"
            )
        })
    })
})

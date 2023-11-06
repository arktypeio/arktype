import { attest } from "@arktype/attest"
import { writeIndivisibleMessage } from "@arktype/schema"
import { type } from "arktype"
import { suite, test } from "mocha"
import { writeInvalidDivisorMessage } from "../parser/string/shift/operator/divisor.js"

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
		test("whitespace after %", () => {
			attest(type("number % 5").infer).typed as number
		})
		test("with bound", () => {
			const t = type("number%8<3")
			attest(t.condition).equals(type("number%8").and("number<3").condition)
			attest(t.root.description).snap("(a multiple of 8 and less than 3)")
		})
		test("allows non-narrowed divisor", () => {
			const z = 5 as number
			attest(type(`number%${z}`).infer).typed as number
		})
		test("fails at runtime on non-integer divisor", () => {
			attest(() => type("number%2.3")).throws(writeInvalidDivisorMessage("2.3"))
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
				.type.errors("Divisibility operand number | string must be a number")
		})
	})
	suite("intersection", () => {
		test("identical", () => {
			const t = type("number%2&number%2")
			attest(t.condition).equals(type("number%2").condition)
		})
		test("purely divisible", () => {
			const t = type("number%4&number%2")
			attest(t.condition).equals(type("number%4").condition)
		})
		test("common divisor", () => {
			const t = type("number%6&number%4")
			attest(t.condition).equals(type("number%12").condition)
		})
		test("relatively prime", () => {
			const t = type("number%2&number%3")
			attest(t.condition).equals(type("number%6").condition)
		})
		test("valid literal", () => {
			const t = type("number%5&0")
			attest(t.condition).equals(type("0").condition)
		})
		test("invalid literal", () => {
			attest(() => type("number%3&8")).throws(
				"Intersection of (a multiple of 3) and 8 results in an unsatisfiable type"
			)
		})
	})
})

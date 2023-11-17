import { attest } from "@arktype/attest"
import { writeIndivisibleMessage } from "@arktype/schema"
import { type } from "arktype"
import { writeInvalidDivisorMessage } from "../parser/string/shift/operator/divisor.ts"

describe("divisibility", () => {
	describe("parse", () => {
		it("integer literal", () => {
			const divisibleByTwo = type("number%2")
			attest<number>(divisibleByTwo.infer)
			attest(divisibleByTwo.json).snap({ basis: "number", divisor: 2 })
		})
		it("whitespace after %", () => {
			const t = type("number % 5")
			attest<number>(t.infer)
			attest(t.json).snap({ basis: "number", divisor: 5 })
		})
		it("with bound", () => {
			const t = type("number%8<3")
			attest(t.json).equals(type("number%8").and("number<3").json)
			attest(t.root.description).snap(
				"a number and a multiple of 8 and less than 3"
			)
		})
		it("allows non-narrowed divisor", () => {
			const d = 5 as number
			attest<number>(type(`number%${d}`).infer)
		})
		it("fails at runtime on non-integer divisor", () => {
			attest(() => type("number%2.3")).throws(writeInvalidDivisorMessage("2.3"))
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
		it("unknown", () => {
			// @ts-expect-error
			attest(() => type("unknown%2")).throwsAndHasTypeError(
				writeIndivisibleMessage("unknown")
			)
		})
		it("indivisible", () => {
			// @ts-expect-error
			attest(() => type("string%1")).throwsAndHasTypeError(
				writeIndivisibleMessage("string")
			)
		})
		it("overlapping", () => {
			// @ts-expect-error
			attest(() => type("(number|string)%10"))
				.throws("Divisibility operand string must be a number")
				.type.errors("Divisibility operand number | string must be a number")
		})
	})
	describe("intersection", () => {
		it("identical", () => {
			const t = type("number%2&number%2")
			attest(t.json).equals(type("number%2").json)
		})
		it("purely divisible", () => {
			const t = type("number%4&number%2")
			attest(t.json).equals(type("number%4").json)
		})
		it("common divisor", () => {
			const t = type("number%6&number%4")
			attest(t.json).equals(type("number%12").json)
		})
		it("relatively prime", () => {
			const t = type("number%2&number%3")
			attest(t.json).equals(type("number%6").json)
		})
		it("valid literal", () => {
			const t = type("number%5&0")
			attest(t.json).equals(type("0").json)
		})
		it("invalid literal", () => {
			attest(() => type("number%3&8")).throws(
				"Intersection of (a multiple of 3) and 8 results in an unsatisfiable type"
			)
		})
	})
})

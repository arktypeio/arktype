import { attest, contextualize } from "@ark/attest"
import { intrinsic, writeIndivisibleMessage } from "@ark/schema"
import { type } from "arktype"
import { writeInvalidDivisorMessage } from "arktype/internal/parser/shift/operator/divisor.ts"

contextualize(() => {
	describe("parse", () => {
		it("integer literal", () => {
			const divisibleByTwo = type("number%2")
			attest<number>(divisibleByTwo.infer)
			attest(divisibleByTwo.json).snap({ domain: "number", divisor: 2 })
		})

		it("chained", () => {
			const t = type("number").divisibleBy(2)
			const expected = type("number%2")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("whitespace after %", () => {
			const t = type("number % 5")
			attest<number>(t.infer)
			attest(t.json).snap({ domain: "number", divisor: 5 })
		})

		it("with bounds", () => {
			const t = type("7<number%8<222")
			const expected = type("number%8").and("7<number<222")
			attest(t.json).equals(expected.json)
			attest(t.description).snap(
				"a multiple of 8 and more than 7 and less than 222"
			)
		})

		it("docs example", () => {
			const n = type("0 < number <= 100")

			attest(n.description).snap("positive and at most 100")
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
				writeIndivisibleMessage(intrinsic.unknown)
			)
		})

		it("indivisible", () => {
			// @ts-expect-error
			attest(() => type("string%1")).throwsAndHasTypeError(
				writeIndivisibleMessage(intrinsic.string)
			)
		})

		it("morph", () => {
			// @ts-expect-error
			attest(() => type("string.numeric.parse > 2"))
				.throws.snap(
					"ParseError: MinLength operand must be a string or an array (was a morph)"
				)
				.type.errors.snap(
					"Argument of type '\"string.numeric.parse > 2\"' is not assignable to parameter of type '\"To constrain the output of string.numeric.parse, pipe like myMorph.to('number > 0').\\\\nTo constrain the input, intersect like myMorph.and('number > 0'). \"'."
				)
		})

		it("chained indivisible", () => {
			// @ts-expect-error
			attest(() => type("string").divisibleBy(2))
				.throws(writeIndivisibleMessage(intrinsic.string))
				.type.errors("Property 'divisibleBy' does not exist")
		})

		it("overlapping", () => {
			// @ts-expect-error
			attest(() => type("(number|string)%10")).throwsAndHasTypeError(
				writeIndivisibleMessage(intrinsic.number.or(intrinsic.string))
			)
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
			attest(() => type("number%3&8")).throws.snap(
				"ParseError: Intersection of % 3 and 8 results in an unsatisfiable type"
			)
		})
	})
})

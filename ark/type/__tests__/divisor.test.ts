import { attest, contextualize } from "@ark/attest"
import { intrinsic, toJson, writeIndivisibleMessage } from "@ark/schema"
import { type } from "arktype"
import { writeInvalidDivisorMessage } from "arktype/internal/parser/shift/operator/divisor.ts"

contextualize(() => {
	describe("parse", () => {
		it("integer literal", () => {
			const DivisibleByTwo = type("number%2")
			attest<number>(DivisibleByTwo.infer)
			attest(toJson(DivisibleByTwo)).snap({ domain: "number", divisor: 2 })
		})

		it("chained", () => {
			const T = type("number").divisibleBy(2)
			const Expected = type("number%2")
			attest<typeof Expected>(T)
			attest(toJson(T)).equals(toJson(Expected))
		})

		it("whitespace after %", () => {
			const T = type("number % 5")
			attest<number>(T.infer)
			attest(toJson(T)).snap({ domain: "number", divisor: 5 })
		})

		it("with bounds", () => {
			const T = type("7<number%8<222")
			const Expected = type("number%8").and("7<number<222")
			attest(toJson(T)).equals(toJson(Expected))
			attest(T.description).snap(
				"a multiple of 8 and more than 7 and less than 222"
			)
		})

		it("docs example", () => {
			const N = type("0 < number <= 100")

			attest(N.description).snap("positive and at most 100")
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
				.type.errors(
					"To constrain the output of string.numeric.parse, pipe like myMorph.to('number > 0').\\nTo constrain the input, intersect like myMorph.and('number > 0')"
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
			const T = type("number%2&number%2")
			attest(toJson(T)).equals(toJson(type("number%2")))
		})

		it("purely divisible", () => {
			const T = type("number%4&number%2")
			attest(toJson(T)).equals(toJson(type("number%4")))
		})

		it("common divisor", () => {
			const T = type("number%6&number%4")
			attest(toJson(T)).equals(toJson(type("number%12")))
		})

		it("relatively prime", () => {
			const T = type("number%2&number%3")
			attest(toJson(T)).equals(toJson(type("number%6")))
		})

		it("valid literal", () => {
			const T = type("number%5&0")
			attest(toJson(T)).equals(toJson(type("0")))
		})

		it("invalid literal", () => {
			attest(() => type("number%3&8")).throws.snap(
				"ParseError: Intersection of % 3 and 8 results in an unsatisfiable type"
			)
		})
	})
})

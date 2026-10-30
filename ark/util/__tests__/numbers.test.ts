import { attest, contextualize } from "@ark/attest"
import {
	isNumericString,
	isWellFormedNumber,
	nearestFloat,
	numericStringMatcher
} from "@ark/util"

contextualize(() => {
	describe("nearestFloat", () => {
		it("0", () => {
			attest(nearestFloat(0)).equals(Number.MIN_VALUE)
			attest(nearestFloat(0, "-")).equals(-Number.MIN_VALUE)
		})

		it("small integer", () => {
			attest(nearestFloat(2)).snap(2.0000000000000004)
			attest(nearestFloat(-2)).snap(-1.9999999999999998)
		})

		it("small decimal", () => {
			attest(nearestFloat(2.1)).snap(2.1000000000000005)
			attest(nearestFloat(-2.1)).snap(-2.0999999999999996)
		})

		it("large integer", () => {
			attest(nearestFloat(5555555555555555)).equals(5555555555555556)
			attest(nearestFloat(5555555555555555, "-")).equals(5555555555555554)
			attest(nearestFloat(-5555555555555555)).snap(-5555555555555554)
			attest(nearestFloat(-5555555555555555, "-")).equals(-5555555555555556)
		})
	})

	describe("number matchers", () => {
		it("wellFormedNumberMatcher rejects decimal-only numbers", () => {
			attest(isWellFormedNumber(".5")).equals(false)
			attest(isWellFormedNumber("0.5")).equals(true)
		})

		it("numericStringMatcher accepts decimal-only numbers", () => {
			attest(isNumericString(".5")).equals(true)
			attest(isNumericString("0.5")).equals(true)
		})

		it("wellFormedNumberMatcher rejects trailing zeros in decimals", () => {
			attest(isWellFormedNumber("0.10")).equals(false)
			attest(isWellFormedNumber("0.1")).equals(true)
		})

		it("numericStringMatcher accepts trailing zeros in decimals", () => {
			attest(isNumericString("0.10")).equals(true)
			attest(isNumericString("0.1")).equals(true)
		})

		it("both matchers reject negative zero", () => {
			attest(isWellFormedNumber("-0")).equals(false)
			attest(isNumericString("-0")).equals(false)
		})

		it("both matchers accept valid integers", () => {
			attest(isWellFormedNumber("123")).equals(true)
			attest(isNumericString("123")).equals(true)
			attest(isWellFormedNumber("-123")).equals(true)
			attest(isNumericString("-123")).equals(true)
		})

		it("both matchers accept valid decimals", () => {
			attest(isWellFormedNumber("123.456")).equals(true)
			attest(isNumericString("123.456")).equals(true)
			attest(isWellFormedNumber("-123.456")).equals(true)
			attest(isNumericString("-123.456")).equals(true)
		})

		it("wellFormedNumberMatcher requires an integer portion", () => {
			attest(isWellFormedNumber("")).equals(false)
			attest(isWellFormedNumber("-")).equals(false)
		})

		// https://github.com/arktypeio/arktype/issues/1448
		it("numericStringMatcher accepts exponents", () => {
			const results = Object.fromEntries(
				[
					"5.7e-10",
					"1E5",
					"1e+5",
					".5e3",
					"0e0",
					"1e",
					"1e+",
					"e5",
					"1.e5",
					"-0e5",
					"-0.0E-3"
				].map(s => {
					const isNumeric = isNumericString(s)
					attest(numericStringMatcher.test(s)).equals(isNumeric)
					return [s, isNumeric]
				})
			)
			attest(results).snap({
				"5.7e-10": true,
				"1E5": true,
				"1e+5": true,
				".5e3": true,
				"0e0": true,
				"1e": false,
				"1e+": false,
				e5: false,
				"1.e5": false,
				"-0e5": false,
				"-0.0E-3": false
			})
		})

		it("numericStringMatcher requires an integer or decimal portion", () => {
			attest(isNumericString("")).equals(false)
			attest(isNumericString("-")).equals(false)
		})
	})
})

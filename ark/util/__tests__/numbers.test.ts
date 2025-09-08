import { attest, contextualize } from "@ark/attest"
import { isNumericString, isWellFormedNumber, nearestFloat } from "@ark/util"

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
	})
})

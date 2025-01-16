import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("integer", () => {
		const integer = type("number.integer")
		attest(integer(123)).equals(123)
		attest(integer("123").toString()).snap("must be a number (was a string)")
		attest(integer(12.12).toString()).snap("must be an integer (was 12.12)")
	})

	it("epoch", () => {
		const epoch = type("number.epoch")

		// valid
		attest(epoch(1621530000)).equals(1621530000)
		attest(epoch(8640000000000000)).equals(8640000000000000)
		attest(epoch(-8640000000000000)).equals(-8640000000000000)

		// invalid
		attest(epoch("foo").toString()).snap(
			"must be a number representing a Unix timestamp (was a string)"
		)
		attest(epoch(1.5).toString()).snap(
			"must be an integer representing a Unix timestamp (was 1.5)"
		)
		attest(epoch(-8640000000000001).toString()).snap(
			"must be a Unix timestamp after -8640000000000000 (was -8640000000000001)"
		)
		attest(epoch(8640000000000001).toString()).snap(
			"must be a Unix timestamp before 8640000000000000 (was 8640000000000001)"
		)
	})

	it("safe", () => {
		const safe = type("number.safe")

		attest(safe.allows(Number.MAX_SAFE_INTEGER)).equals(true)
		attest(safe.allows(Number.MIN_SAFE_INTEGER)).equals(true)
		attest(safe.allows(0)).equals(true)
		attest(safe.allows(0.5)).equals(true)
		attest(safe(Number.MAX_SAFE_INTEGER + 1).toString()).snap(
			"must be at most 9007199254740991 (was 9007199254740992)"
		)
		attest(safe(Number.MIN_SAFE_INTEGER - 1).toString()).snap(
			"must be at least -9007199254740991 (was -9007199254740992)"
		)
		attest(safe(Infinity).toString()).snap(
			"must be at most 9007199254740991 (was Infinity)"
		)
		attest(safe(-Infinity).toString()).snap(
			"must be at least -9007199254740991 (was -Infinity)"
		)
		attest(safe(NaN).toString()).snap("must be a number (was NaN)")
	})

	it("doesn't allow NaN by default", () => {
		attest(type.number.allows(Number.NaN)).equals(false)
		attest(type.number(Number.NaN).toString()).snap(
			"must be a number (was NaN)"
		)
	})

	it("NaN", () => {
		const nan = type("number.NaN")

		attest(nan.allows(Number.NaN)).equals(true)
		attest(nan(0).toString()).snap("must be NaN (was 0)")
	})

	it("PositiveInfinity", () => {
		const infinity = type("number.Infinity")
		attest(infinity.allows(Number.POSITIVE_INFINITY)).equals(true)
		attest(infinity(0).toString()).snap("must be Infinity (was 0)")
		attest(infinity(Number.NEGATIVE_INFINITY).toString()).snap(
			"must be Infinity (was -Infinity)"
		)
	})

	it("NegativeInfinity", () => {
		const negativeInfinity = type("number.NegativeInfinity")
		attest(negativeInfinity.allows(Number.NEGATIVE_INFINITY)).equals(true)
		attest(negativeInfinity(0).toString()).snap("must be -Infinity (was 0)")
		attest(negativeInfinity(Number.POSITIVE_INFINITY).toString()).snap(
			"must be -Infinity (was Infinity)"
		)
	})
})

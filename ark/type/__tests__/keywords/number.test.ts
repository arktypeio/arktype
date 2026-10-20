import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"
import { type } from "arktype"

contextualize(() => {
	it("integer", () => {
		const Integer = type("number.integer")
		attest(Integer(123)).equals(123)
		attest(Integer("123").toString()).snap("must be a number (was a string)")
		attest(Integer(12.12).toString()).snap("must be an integer (was 12.12)")
	})

	it("epoch", () => {
		const Epoch = type("number.epoch")

		// valid
		attest(Epoch(1621530000)).equals(1621530000)
		attest(Epoch(8640000000000000)).equals(8640000000000000)
		attest(Epoch(-8640000000000000)).equals(-8640000000000000)

		// invalid
		attest(Epoch("foo").toString()).snap(
			"must be a number representing a Unix timestamp (was a string)"
		)
		attest(Epoch(1.5).toString()).snap(
			"must be an integer representing a Unix timestamp (was 1.5)"
		)
		attest(Epoch(-8640000000000001).toString()).snap(
			"must be a Unix timestamp after -8640000000000000 (was -8640000000000001)"
		)
		attest(Epoch(8640000000000001).toString()).snap(
			"must be a Unix timestamp before 8640000000000000 (was 8640000000000001)"
		)
	})

	it("safe", () => {
		const Safe = type("number.safe")

		attest(Safe.allows(Number.MAX_SAFE_INTEGER)).equals(true)
		attest(Safe.allows(Number.MIN_SAFE_INTEGER)).equals(true)
		attest(Safe.allows(0)).equals(true)
		attest(Safe.allows(0.5)).equals(true)
		attest(Safe(Number.MAX_SAFE_INTEGER + 1).toString()).snap(
			"must be at most 9007199254740991 (was 9007199254740992)"
		)
		attest(Safe(Number.MIN_SAFE_INTEGER - 1).toString()).snap(
			"must be at least -9007199254740991 (was -9007199254740992)"
		)
		attest(Safe(Infinity).toString()).snap(
			"must be at most 9007199254740991 (was Infinity)"
		)
		attest(Safe(-Infinity).toString()).snap(
			"must be at least -9007199254740991 (was -Infinity)"
		)
		attest(Safe(NaN).toString()).snap("must be a number (was NaN)")
	})

	it("doesn't allow NaN by default", () => {
		attest(type.number.allows(Number.NaN)).equals(false)
		attest(type.number(Number.NaN).toString()).snap(
			"must be a number (was NaN)"
		)
	})

	it("doesn't allow NaN in discriminated unions", () => {
		const NumberOrNull = type("number | null")
		attest(NumberOrNull(5)).equals(5)
		attest(NumberOrNull(null)).equals(null)
		attest(NumberOrNull.allows(Number.NaN)).equals(false)
		attest(NumberOrNull(Number.NaN)?.toString()).snap(
			"must be a number (was NaN)"
		)

		attest(type("number | string")(Number.NaN).toString()).snap(
			"must be a number (was NaN)"
		)
		attest(type("number > 0 | null")(Number.NaN)?.toString()).snap(
			"must be a number (was NaN)"
		)

		const Prop = type({ a: "number" }).or({ a: "string" })
		attest(Prop({ a: 5 })).equals({ a: 5 })
		attest(Prop.allows({ a: Number.NaN })).equals(false)
		attest(Prop({ a: Number.NaN }).toString()).snap(
			"a must be a number (was NaN)"
		)
	})

	it("doesn't allow NaN in discriminated unions jitless", () => {
		const types = type.module(
			{
				NumberOrNull: "number | null",
				Prop: [{ a: "number" }, "|", { a: "string" }]
			},
			{ jitless: true }
		)
		attest(types.NumberOrNull.precompilation).equals(undefined)
		attest(types.NumberOrNull.allows(Number.NaN)).equals(false)
		attest(types.NumberOrNull(Number.NaN)?.toString()).snap(
			"must be a number or null (was NaN)"
		)
		attest(types.Prop.allows({ a: Number.NaN })).equals(false)
		attest(types.Prop({ a: Number.NaN }).toString()).snap(
			"a must be a number or a string (was NaN)"
		)
	})

	it("allows NaN in discriminated unions with numberAllowsNaN", () => {
		const T = rootSchema([
			{ domain: "number", numberAllowsNaN: true },
			{ unit: null }
		])
		attest(T.allows(Number.NaN)).equals(true)
	})

	it("NaN", () => {
		const Nan = type("number.NaN")

		attest(Nan.allows(Number.NaN)).equals(true)
		attest(Nan(0).toString()).snap("must be NaN (was 0)")
	})

	it("PositiveInfinity", () => {
		const Inf = type("number.Infinity")
		attest(Inf.allows(Number.POSITIVE_INFINITY)).equals(true)
		attest(Inf(0).toString()).snap("must be Infinity (was 0)")
		attest(Inf(Number.NEGATIVE_INFINITY).toString()).snap(
			"must be Infinity (was -Infinity)"
		)
	})

	it("NegativeInfinity", () => {
		const NegInf = type("number.NegativeInfinity")
		attest(NegInf.allows(Number.NEGATIVE_INFINITY)).equals(true)
		attest(NegInf(0).toString()).snap("must be -Infinity (was 0)")
		attest(NegInf(Number.POSITIVE_INFINITY).toString()).snap(
			"must be -Infinity (was Infinity)"
		)
	})
})

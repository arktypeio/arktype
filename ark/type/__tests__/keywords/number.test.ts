import { attest, contextualize } from "@ark/attest"
import { rootSchema, schemaScope } from "@ark/schema"
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
		attest(Safe(Infinity).toString()).snap("must be a number (was Infinity)")
		attest(Safe(-Infinity).toString()).snap("must be a number (was -Infinity)")
		attest(Safe(NaN).toString()).snap("must be a number (was NaN)")
	})

	it("doesn't allow NaN by default", () => {
		attest(type.number.allows(Number.NaN)).equals(false)
		attest(type.number(Number.NaN).toString()).snap(
			"must be a number (was NaN)"
		)
	})

	it("doesn't allow Infinity by default", () => {
		attest(type.number.allows(Number.POSITIVE_INFINITY)).equals(false)
		attest(type.number.allows(Number.NEGATIVE_INFINITY)).equals(false)
		attest(type.number(Number.POSITIVE_INFINITY).toString()).snap(
			"must be a number (was Infinity)"
		)
		attest(type.number(Number.NEGATIVE_INFINITY).toString()).snap(
			"must be a number (was -Infinity)"
		)
	})

	it("allows Infinity in a union with number.Infinity", () => {
		const T = type("number | number.Infinity")
		attest(T.expression).snap("number | Infinity")
		attest(T.allows(Number.POSITIVE_INFINITY)).equals(true)
		attest(T(Number.NEGATIVE_INFINITY).toString()).snap(
			"must be a number or Infinity (was -Infinity)"
		)
	})

	it("numberAllowsInfinity", () => {
		const T = rootSchema({ domain: "number", numberAllowsInfinity: true })
		attest(T.expression).snap("number | Infinity | -Infinity")
		attest(T.allows(Number.POSITIVE_INFINITY)).equals(true)
		attest(T.allows(Number.NEGATIVE_INFINITY)).equals(true)
		attest(T.allows(Number.NaN)).equals(false)
	})

	it("numberAllowsInfinity on non-number", () => {
		attest(() =>
			rootSchema({ domain: "string", numberAllowsInfinity: true } as never)
		).throws.snap(
			'ParseError: numberAllowsInfinity may only be specified with domain "number" (was string)'
		)
	})

	it("intersection allows non-finite values allowed by both", () => {
		const Infinite = rootSchema({
			domain: "number",
			numberAllowsInfinity: true
		})
		const NaNable = rootSchema({ domain: "number", numberAllowsNaN: true })
		const Both = rootSchema({
			domain: "number",
			numberAllowsNaN: true,
			numberAllowsInfinity: true
		})
		attest(Infinite.and(Both).json).equals(Infinite.json)
		attest(Both.and(NaNable).json).equals(NaNable.json)
		const Neither = Infinite.and(NaNable)
		attest(Neither.allows(Number.POSITIVE_INFINITY)).equals(false)
		attest(Neither.allows(Number.NaN)).equals(false)
		attest(Neither.allows(0)).equals(true)
	})

	it("non-finite checks are consistent without jit", () => {
		for (const jitless of [false, true]) {
			const $ = schemaScope(
				{
					finite: "number",
					nanable: { domain: "number", numberAllowsNaN: true },
					infinitable: { domain: "number", numberAllowsInfinity: true },
					nonFinite: {
						domain: "number",
						numberAllowsNaN: true,
						numberAllowsInfinity: true
					}
				},
				{ jitless }
			).export()
			const allowed = (data: unknown) =>
				[$.finite, $.nanable, $.infinitable, $.nonFinite].map(T =>
					T.allows(data)
				)
			attest(allowed(0)).equals([true, true, true, true])
			attest(allowed(Number.NaN)).equals([false, true, false, true])
			attest(allowed(Number.POSITIVE_INFINITY)).equals([
				false,
				false,
				true,
				true
			])
			attest(allowed(Number.NEGATIVE_INFINITY)).equals([
				false,
				false,
				true,
				true
			])
			attest(allowed("0")).equals([false, false, false, false])
			attest($.infinitable.traverse(Number.NaN)?.toString()).equals(
				"must be a number (was NaN)"
			)
			attest($.nanable.traverse(Number.POSITIVE_INFINITY)?.toString()).equals(
				"must be a number (was Infinity)"
			)
		}
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

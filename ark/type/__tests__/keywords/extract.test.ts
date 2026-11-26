import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"

contextualize(() => {
	it("parsed", () => {
		const types = scope({
			from: "0 | 1",
			actual: "Extract<from, 1>",
			expected: "1"
		}).export()

		attest<typeof types.expected.t>(types.actual.t)
		attest(types.actual.expression).equals(types.expected.expression)
	})

	it("chained", () => {
		const Extracted = type("true | 0 | 'foo'").extract("boolean | number")

		const Expected = type("true | 0")

		attest<typeof Expected.t>(Extracted.t)

		attest(Extracted.expression).equals(Expected.expression)
	})

	it("merged object union branches", () => {
		const U = type({ kind: "'a'", x: "string" }).or({
			kind: "'b'",
			x: "string"
		})
		const Extracted = U.extract({ kind: "'a'", x: "string" })
		attest<{ kind: "a"; x: string }>(Extracted.infer)
		attest(Extracted.expression).snap('{ kind: "a", x: string }')

		const ByDiscriminant = U.extract({ kind: "'a'" })
		attest<{ kind: "a"; x: string }>(ByDiscriminant.infer)
		attest(ByDiscriminant.expression).snap('{ kind: "a", x: string }')

		const Nested = type({ outer: { kind: "'a'", x: "string" } }).or({
			outer: { kind: "'b'", x: "string" }
		})
		attest(
			Nested.extract({ outer: { kind: "'a'", x: "string" } }).expression
		).snap('{ outer: { kind: "a", x: string } }')

		// disjoint / extra required key does not fabricate an intersection
		attest(type({ a: "string" }).extract({ b: "number" }).expression).snap(
			"never"
		)
		attest(
			type({ a: "string | number" }).extract({ a: "string", b: "boolean" })
				.expression
		).snap("never")
	})

	it("merged range branches", () => {
		attest(
			type("number < 0 | number > 0").extract("number > 0").expression
		).snap("number > 0")
		attest(
			type("number < 0 | number > 0").extract("number < 0").expression
		).snap("number < 0")
		attest(
			type("1 <= number <= 10").extract("5 <= number <= 10").expression
		).snap("5 <= number <= 10")
		attest(type("0 < number < 5 | 5").extract("5").expression).snap("5")
		attest(
			type("string == 3 | string == 4").extract("string == 3").expression
		).snap("string == 3")
		attest(type("string == 0 | string == 1").extract("''").expression).snap(
			'""'
		)
		attest(
			type("Date < d'2025-01-01' | Date > d'2025-01-01'").extract(
				"Date > d'2025-01-01'"
			).expression
		).snap("Date >= d'2025-01-01T00:00:00.001Z'")
		// unmerged domain does not extract a literal or refinement
		attest(type("number").extract("0").expression).snap("never")
		attest(type("number").extract("number > 0").expression).snap("never")
	})

	it("optional properties partition missing-key case accurately", () => {
		const OptExtr = type({ "a?": "'x' | 'y'" }).extract({ "a?": "'x'" })
		attest(OptExtr.expression).snap('{ a?: "x" }')
		attest(OptExtr.allows({})).equals(true)
		attest(OptExtr.allows({ a: "x" })).equals(true)
		attest(OptExtr.allows({ a: "y" })).equals(false)

		const MergedReqOpt = type({ a: "'x'" }).or({ "a?": "'y'" })
		const ExtrReq = MergedReqOpt.extract({ a: "'x'" })
		attest(ExtrReq.expression).snap('{ a: "x" }')
		attest(ExtrReq.allows({})).equals(false)
		attest(ExtrReq.allows({ a: "x" })).equals(true)
		attest(ExtrReq.allows({ a: "y" })).equals(false)
	})

	it("morph union at merged property", () => {
		const U = type({ a: type("'x'").pipe(() => 1) }).or({
			a: type("'y'").pipe(() => 2)
		})
		const Extracted = U.extract({ a: "'x'" })
		attest(Extracted.internal({ a: "x" })).equals({ a: 1 })
		attest(Extracted.allows({ a: "y" })).equals(false)
	})
})

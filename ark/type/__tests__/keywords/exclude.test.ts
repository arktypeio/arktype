import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"
import { scope, type, type Out } from "arktype"

contextualize(() => {
	it("parsed", () => {
		const types = scope({
			from: "0 | 1",
			actual: "Exclude<from, 1>",
			expected: "0"
		}).export()

		attest<typeof types.expected.t>(types.actual.t)
		attest(types.actual.expression).equals(types.expected.expression)
	})

	it("chained", () => {
		const Excluded = type("true | 0 | 'foo'").exclude("string")

		const Expected = type("true | 0")

		attest<typeof Expected.t>(Excluded.t)

		attest(Excluded.expression).equals(Expected.expression)
	})

	it("merged object union branches", () => {
		const U = type({ kind: "'a'", x: "string" }).or({
			kind: "'b'",
			x: "string"
		})
		const Excluded = U.exclude({ kind: "'a'", x: "string" })
		attest<{ kind: "b"; x: string }>(Excluded.infer)
		attest(Excluded.expression).snap('{ kind: "b", x: string }')

		const ByDiscriminant = U.exclude({ kind: "'a'" })
		attest<{ kind: "b"; x: string }>(ByDiscriminant.infer)
		attest(ByDiscriminant.expression).snap('{ kind: "b", x: string }')

		const Nested = type({ outer: { kind: "'a'", x: "string" } }).or({
			outer: { kind: "'b'", x: "string" }
		})
		attest(
			Nested.exclude({ outer: { kind: "'a'", x: "string" } }).expression
		).snap('{ outer: { kind: "b", x: string } }')

		const Multi = type({ a: "'1' | '2'", b: "'x' | 'y'" })
		attest(Multi.exclude({ a: "'1'", b: "'x'" }).expression).snap(
			'{ a: "1", b: "y" } | { a: "2", b: "x" | "y" }'
		)

		// unrelated required key leaves the branch intact
		attest(type({ a: "string" }).exclude({ b: "number" }).expression).snap(
			"{ a: string }"
		)
	})

	it("merged range branches", () => {
		attest(
			type("number < 0 | number > 0").exclude("number > 0").expression
		).snap("number < 0")
		attest(
			type("number < 0 | number > 0").exclude("number < 0").expression
		).snap("number > 0")
		attest(
			type("1 <= number <= 10").exclude("5 <= number <= 10").expression
		).snap("1 <= number < 5")
		attest(type("0 < number < 5 | 5").exclude("5").expression).snap(
			"0 < number < 5"
		)
		attest(
			type("string == 3 | string == 4").exclude("string == 3").expression
		).snap("string == 4")
		attest(type("string == 0 | string == 1").exclude("''").expression).snap(
			"string == 1"
		)
		attest(
			type("Date < d'2025-01-01' | Date > d'2025-01-01'").exclude(
				"Date > d'2025-01-01'"
			).expression
		).snap("Date <= d'2024-12-31T23:59:59.999Z'")
		// Date min/max timestamp boundaries do not overflow into Invalid Date
		const maxDate = new Date(8_640_000_000_000_000)
		const minDate = new Date(-8_640_000_000_000_000)
		const withoutMax = rootSchema({
			proto: Date,
			after: new Date("2025-01-01T00:00:00.000Z")
		}).exclude(rootSchema({ unit: maxDate }))
		attest(withoutMax.allows(maxDate)).equals(false)
		attest(withoutMax.allows(new Date("2025-01-01T00:00:00.000Z"))).equals(true)
		const withoutMin = rootSchema({
			proto: Date,
			before: new Date("2025-01-01T00:00:00.000Z")
		}).exclude(rootSchema({ unit: minDate }))
		attest(withoutMin.allows(minDate)).equals(false)
		attest(withoutMin.allows(new Date("2025-01-01T00:00:00.000Z"))).equals(true)
		// unmerged domain does not exclude a literal or refinement
		attest(type("number").exclude("0").expression).snap("number")
		attest(type("number").exclude("number > 0").expression).snap("number")
	})

	it("optional properties partition missing-key case without overlap", () => {
		const OptExcl = type({ "a?": "'x' | 'y'" }).exclude({ "a?": "'x'" })
		attest(OptExcl.expression).snap('{ a: "y" }')
		attest(OptExcl.allows({})).equals(false)
		attest(OptExcl.allows({ a: "x" })).equals(false)
		attest(OptExcl.allows({ a: "y" })).equals(true)

		const MultiOptExcl = type({ a: "'x'", "b?": "'1' | '2'" }).exclude({
			a: "'x'",
			"b?": "'1'"
		})
		attest(MultiOptExcl.expression).snap('{ a: "x", b: "2" }')
		attest(MultiOptExcl.allows({ a: "x" })).equals(false)
		attest(MultiOptExcl.allows({ a: "x", b: "2" })).equals(true)

		const MergedReqOpt = type({ a: "'x'" }).or({ "a?": "'y'" })
		const ExclReq = MergedReqOpt.exclude({ a: "'x'" })
		attest(ExclReq.expression).snap('{ a?: "y" }')
		attest(ExclReq.allows({})).equals(true)
		attest(ExclReq.allows({ a: "x" })).equals(false)
		attest(ExclReq.allows({ a: "y" })).equals(true)
	})

	it("morph union at merged property", () => {
		const X = type("'x'").pipe(() => 1)
		const U = type({ a: X }).or({
			a: type("'y'").pipe(() => 2)
		})
		const ExcludedByMorph = U.exclude({ a: X })
		attest<{ a: (In: "y") => Out<number> }>(ExcludedByMorph.t)
		attest(ExcludedByMorph.expression).snap('{ a: (In: "y") => Out<unknown> }')
		attest(ExcludedByMorph({ a: "y" })).equals({ a: 2 })
		attest(ExcludedByMorph.allows({ a: "x" })).equals(false)

		const ExcludedByInput = U.exclude({ a: "'x'" })
		attest(ExcludedByInput.expression).equals(ExcludedByMorph.expression)
	})

	it("merged morph branches with shared morph", () => {
		const print = (v: string | number) => `${v}`
		const StrPrint = type("string").pipe(print)
		const NumPrint = type("number").pipe(print)
		const U = StrPrint.or(NumPrint)

		const ExcludedByMorph = U.exclude(StrPrint)
		attest<(In: number) => Out<string>>(ExcludedByMorph.t)
		attest(ExcludedByMorph.expression).equals(NumPrint.expression)
		attest(ExcludedByMorph(5)).equals("5")
		attest(ExcludedByMorph("5").toString()).snap("must be a number")

		const ExcludedByInput = U.exclude("string")
		attest(ExcludedByInput.expression).equals(NumPrint.expression)
	})

	it("branches holding distinct morphs at a key before the one they're disjoint at", () => {
		const Measured = type({ a: type("string").pipe(s => s.length), k: "'a'" })
		const Trimmed = type({ a: type("string").pipe(s => s.trim()), k: "'b'" })

		const T = Measured.or(Trimmed).exclude(Measured)

		attest<{ a: (In: string) => Out<string>; k: "b" }>(T.t)
		attest(T.expression).equals(Trimmed.expression)
		attest(T({ a: " a ", k: "b" })).equals({ a: "a", k: "b" })
	})

	it("does not blow up on many union props against unsatisfiable required keys", () => {
		const bigDef: Record<string, string> = {}
		const rBranches: Record<string, string>[] = []
		for (let i = 0; i < 14; i++) {
			bigDef[`a${i}`] = "'0' | '1'"
			rBranches.push({ [`a${i}`]: "'0'", extra: "string" })
		}
		const Big = type.raw(bigDef)
		const R = rBranches
			.slice(1)
			.reduce((acc, b) => acc.or(type.raw(b)), type.raw(rBranches[0]))
		attest(Big.exclude(R).expression).equals(Big.expression)
	})
})

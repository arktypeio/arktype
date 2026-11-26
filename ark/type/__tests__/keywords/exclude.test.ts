import { attest, contextualize } from "@ark/attest"
import { scope, type, type Out, type To } from "arktype"

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

	it("objects merged at a key", () => {
		const T = type({ kind: "'a'", x: "string" })
			.or({ kind: "'b'", x: "string" })
			.exclude({ kind: "'a'", x: "string" })

		attest<{ kind: "b"; x: string }>(T.infer)
		attest(T.expression).snap('{ kind: "b", x: string }')
		attest(T.json).snap({
			required: [
				{ key: "kind", value: { unit: "b" } },
				{ key: "x", value: "string" }
			],
			domain: "object"
		})
	})

	it("objects merged at more than one key", () => {
		const T = type({ a: "1", b: "3" })
			.or({ a: "1", b: "4" })
			.or({ a: "2", b: "3" })
			.or({ a: "2", b: "4" })

		attest(T.expression).snap("{ a: 1 | 2, b: 3 | 4 }")

		const Excluded = T.exclude({ a: "1", b: "3" })

		attest<{ a: 1; b: 4 } | { a: 2; b: 3 } | { a: 2; b: 4 }>(Excluded.infer)
		attest(Excluded.expression).snap("{ a: 1, b: 4 } | { a: 2, b: 3 | 4 }")
	})

	it("objects merged at a nested key", () => {
		const T = type({ a: { kind: "'a'" } })
			.or({ a: { kind: "'b'" } })
			.exclude({ a: { kind: "'a'" } })

		attest<{ a: { kind: "b" } }>(T.infer)
		attest(T.expression).snap('{ a: { kind: "b" } }')
	})

	it("each branch of a union from a merged object", () => {
		const T = type({ kind: "'a'", x: "string", y: "number" })
			.or({ kind: "'b'", x: "string", y: "number" })
			.or({ kind: "'c'", x: "string", y: "number" })
			.exclude(
				type({ kind: "'a'", x: "string" }).or({ kind: "'b'", y: "number" })
			)

		attest<{ kind: "c"; x: string; y: number }>(T.infer)
		attest(T.expression).snap('{ kind: "c", x: string, y: number }')
	})

	it("objects merged beside a morph", () => {
		const T = type({ kind: "'a'", v: "string.numeric.parse" })
			.or({ kind: "'b'", v: "string.numeric.parse" })
			.exclude({ kind: "'a'", v: "string.numeric.parse" })

		attest<{ kind: "b"; v: (In: string) => To<number> }>(T.t)
		attest(T.expression).equals(
			type({ kind: "'b'", v: "string.numeric.parse" }).expression
		)
		attest(T({ kind: "b", v: "5" })).equals({ kind: "b", v: 5 })
		attest(T({ kind: "a", v: "5" }).toString()).snap('kind must be "b"')
	})

	it("morphs merged at their input", () => {
		const print = (data: string | number) => `${data}`
		const T = type("string")
			.pipe(print)
			.or(type("number").pipe(print))
			.exclude(type("string").pipe(print))

		attest<(In: number) => Out<string>>(T.t)
		attest(T.expression).snap("(In: number) => Out<unknown>")
		attest(T(5)).equals("5")
		attest(T("5").toString()).snap("must be a number")
	})

	it("objects merged at a key holding distinct morphs", () => {
		const X = type("'x'").pipe(() => 1)
		const T = type({ a: X }).or({ a: type("'y'").pipe(() => 2) })

		attest(T.expression).snap(
			'{ a: (In: "x") => Out<unknown> | (In: "y") => Out<unknown> }'
		)

		const Excluded = T.exclude({ a: X })

		attest<{ a: (In: "y") => Out<number> }>(Excluded.t)
		attest(Excluded.expression).snap('{ a: (In: "y") => Out<unknown> }')
		attest(Excluded({ a: "y" })).equals({ a: 2 })
		attest(Excluded({ a: "x" }).toString()).snap('a must be "y"')

		// a morph extends what its input does
		attest(T.exclude({ a: "'x'" }).expression).equals(Excluded.expression)
	})

	it("branches holding distinct morphs at a key before the one they're disjoint at", () => {
		const Measured = type({ a: type("string").pipe(s => s.length), k: "'a'" })
		const Trimmed = type({ a: type("string").pipe(s => s.trim()), k: "'b'" })

		const T = Measured.or(Trimmed).exclude(Measured)

		attest<{ a: (In: string) => Out<string>; k: "b" }>(T.t)
		attest(T.expression).equals(Trimmed.expression)
		attest(T({ a: " a ", k: "b" })).equals({ a: "a", k: "b" })
	})

	it("ranges merged at a value neither includes", () => {
		const T = type("number < 0 | number > 0")

		attest(T.expression).snap("number != 0")
		// each range is inferred as number, so what's left is inferred as never
		attest(T.exclude("number > 0").expression).snap("number < 0")
	})

	it("lengths merged around those neither includes", () => {
		const T = type("string <= 1 | string == 3 | string >= 5")

		attest(T.expression).snap("string != 2 & string != 4")

		const Excluded = T.exclude("string >= 3")

		attest(Excluded.expression).snap("string <= 1")
	})

	it("keeps a branch r allows only some of", () => {
		const T = type({ a: "string" }).exclude({ a: "'x'" })

		attest<{ a: string }>(T.infer)
		attest(T.expression).snap("{ a: string }")

		// a basis isn't a merge of ranges
		attest(type("number").exclude("number > 0").expression).snap("number")
	})

	it("keeps a key with a default whole", () => {
		const T = type({ a: "1 | 2 = 1" }).exclude({ a: "1" })

		attest(T.expression).snap("{ a: 1 | 2 = 1 }")
	})
})

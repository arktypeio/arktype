import { attest, contextualize } from "@ark/attest"
import { scope, type, type Out, type To } from "arktype"

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

	it("objects merged at a key", () => {
		const T = type({ kind: "'a'", x: "string" })
			.or({ kind: "'b'", x: "string" })
			.extract({ kind: "'a'", x: "string" })

		attest<{ kind: "a"; x: string }>(T.infer)
		attest(T.expression).snap('{ kind: "a", x: string }')
		attest(T.json).snap({
			required: [
				{ key: "kind", value: { unit: "a" } },
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
			.extract({ a: "1", b: "3" })

		attest<{ a: 1; b: 3 }>(T.infer)
		attest(T.expression).snap("{ a: 1, b: 3 }")
	})

	it("each branch of a union from a merged object", () => {
		const T = type({ kind: "'a'", x: "string", y: "number" })
			.or({ kind: "'b'", x: "string", y: "number" })
			.or({ kind: "'c'", x: "string", y: "number" })
			.extract(
				type({ kind: "'a'", x: "string" }).or({ kind: "'b'", y: "number" })
			)

		attest<
			{ kind: "a"; x: string; y: number } | { kind: "b"; x: string; y: number }
		>(T.infer)
		attest(T.expression).snap('{ kind: "a" | "b", x: string, y: number }')
	})

	it("objects merged beside a morph", () => {
		const T = type({ kind: "'a'", v: "string.numeric.parse" })
			.or({ kind: "'b'", v: "string.numeric.parse" })
			.extract({ kind: "'a'", v: "string.numeric.parse" })

		attest<{ kind: "a"; v: (In: string) => To<number> }>(T.t)
		attest(T.expression).equals(
			type({ kind: "'a'", v: "string.numeric.parse" }).expression
		)
		attest(T({ kind: "a", v: "5" })).equals({ kind: "a", v: 5 })
		attest(T({ kind: "b", v: "5" }).toString()).snap('kind must be "a"')
	})

	it("morphs merged at their input", () => {
		const print = (data: string | number) => `${data}`
		const T = type("string")
			.pipe(print)
			.or(type("number").pipe(print))
			.extract(type("string").pipe(print))

		attest<(In: string) => Out<string>>(T.t)
		attest(T.expression).snap("(In: string) => Out<unknown>")
		attest(T("5")).equals("5")
		attest(T(5).toString()).snap("must be a string")
	})

	it("ranges merged at a value neither includes", () => {
		const T = type("number < 0 | number > 0").extract("number > 0")

		attest<number>(T.infer)
		attest(T.expression).snap("number > 0")
	})

	it("lengths merged around those neither includes", () => {
		const T = type("string <= 1 | string == 3 | string >= 5").extract(
			"string >= 3"
		)

		attest<string>(T.infer)
		attest(T.expression).snap("string >= 3 & string != 4")
	})

	it("Dates merged at one neither includes", () => {
		const T = type("Date < d'2000-01-01' | Date > d'2000-01-01'").extract(
			"Date > d'2000-01-01'"
		)

		attest<Date>(T.infer)
		attest(T.expression).snap("Date >= d'2000-01-01T00:00:00.001Z'")
	})

	it("drops a branch r allows only some of", () => {
		const T = type({ a: "string" }).extract({ a: "'x'" })

		attest<never>(T.infer)
		attest(T.expression).snap("never")

		// a basis isn't a merge of ranges
		attest(type("number").extract("number > 0").expression).snap("never")
	})
})

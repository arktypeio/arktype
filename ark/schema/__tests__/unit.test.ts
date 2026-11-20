import { attest, contextualize } from "@ark/attest"
import { registeredReference, rootSchema } from "@ark/schema"

contextualize(() => {
	it("string allows", () => {
		const T = rootSchema({ unit: "foo" })
		attest(T.json).snap({ unit: "foo" })
		attest(T.allows("foo")).equals(true)
		attest(T.allows("bar")).equals(false)
	})

	it("string apply", () => {
		const T = rootSchema({ unit: "foo" })
		attest(T.json).snap({ unit: "foo" })
		attest(T("foo")).equals("foo")
		attest(T("bar")?.toString()).snap('must be "foo"')
		attest(T(5)?.toString()).snap('must be "foo"')
	})
	it("treats equivalent dates as equal", () => {
		const L = rootSchema({ unit: new Date(1337) })
		const R = rootSchema({ unit: new Date(1337) })
		attest(L.json).snap({ unit: "1970-01-01T00:00:01.337Z" })
		attest(L.json).equals(R.json)
		attest(L.equals(R)).equals(true)
	})

	it("bigint", () => {
		const T = rootSchema({ unit: 7n })
		// serializes to string for JSON
		attest(T.json).snap({ unit: "7n" })
		// preserves the bigint for context
		attest(T.internal.assertIs("unit").errorCtx).equals({
			code: "unit",
			description: "7n",
			unit: 7n,
			meta: {}
		})
		attest(T.allows(6n)).equals(false)
		attest(T.allows(7n)).equals(true)
		attest(T.allows(8n)).equals(false)
	})

	it("undefined", () => {
		const T = rootSchema({ unit: undefined })
		attest(T.json).snap({ unit: "undefined" })
		attest(T.internal.assertIs("unit").errorCtx).equals({
			code: "unit",
			description: "undefined",
			unit: undefined,
			meta: {}
		})
		attest(T.allows(null)).equals(false)
		attest(T.allows(undefined)).equals(true)
		attest(T.allows("undefined")).equals(false)
	})

	it("symbol", () => {
		// this symbol description should not be reused in other tests
		const status = Symbol("status")
		const T = rootSchema({ unit: status })
		// serializes to string for JSON
		attest(T.json).snap({ unit: registeredReference(status) })
		// preserves the symbol for context
		attest(T.internal.assertIs("unit").errorCtx).equals({
			code: "unit",
			description: "Symbol(status)",
			unit: status,
			meta: {}
		})
		attest(T.allows(status)).equals(true)
		attest(T.allows(Symbol("test"))).equals(false)
	})

	it("object reference", () => {
		const o = new Object()
		const ref = registeredReference(o)
		const T = rootSchema({ unit: o })
		attest(T.json).snap({ unit: ref })
		attest(T.internal.assertIs("unit").errorCtx).equals({
			code: "unit",
			description: "{}",
			unit: o,
			meta: {}
		})
		attest(T.allows(o)).equals(true)
		attest(T.allows(new Object())).equals(false)
	})

	it("NaN", () => {
		const T = rootSchema({ unit: NaN })
		attest(T.json).snap({ unit: "NaN" })
		attest(T.expression).snap("NaN")
		attest(T.allows(NaN)).equals(true)
		attest(T.allows(0)).equals(false)
	})

	it("Infinity", () => {
		const T = rootSchema({ unit: Infinity })
		attest(T.json).snap({ unit: "Infinity" })
		attest(T.expression).snap("Infinity")
		attest(T.allows(Infinity)).equals(true)
		attest(T.allows(0)).equals(false)
	})

	it("-Infinity", () => {
		const T = rootSchema({ unit: -Infinity })
		attest(T.json).snap({ unit: "-Infinity" })
		attest(T.expression).snap("-Infinity")
		attest(T.allows(-Infinity)).equals(true)
		attest(T.allows(0)).equals(false)
	})

	it("handles Invalid Date units without throwing RangeError", () => {
		const Invalid = rootSchema({ unit: new Date(Number.NaN) })
		const Str = rootSchema({ unit: "Invalid Date" })

		attest(Invalid.expression).equals("Invalid Date")
		attest(Invalid.description).equals("Invalid Date")
		attest(Invalid.equals(rootSchema({ unit: new Date("not a date") }))).equals(
			true
		)
		attest(Invalid.equals(Str)).equals(false)
		attest(Invalid.extends(rootSchema(Date))).equals(false)

		const fakeDate = Object.create(Date.prototype)
		// exercise uncompiled first call and compiled JIT path
		for (let i = 0; i < 3; i++) {
			attest(Invalid.allows(new Date(Number.NaN))).equals(true)
			attest(Invalid.allows(new Date("bad"))).equals(true)
			attest(Invalid.allows(new Date(0))).equals(false)
			attest(Invalid.allows("Invalid Date")).equals(false)
			attest(Invalid.allows(Number.NaN)).equals(false)
			attest(Invalid.allows(fakeDate)).equals(false)
			attest(Invalid(new Date(0))?.toString()).snap("must be Invalid Date")

			attest(Str.allows("Invalid Date")).equals(true)
			attest(Str.allows(new Date(Number.NaN))).equals(false)
		}

		// fake Date prototype object uses reference identity without throwing TypeError
		const FakeUnit = rootSchema({ unit: fakeDate })
		attest(FakeUnit.allows(fakeDate)).equals(true)
		attest(FakeUnit.allows(Object.create(Date.prototype))).equals(false)
	})
})

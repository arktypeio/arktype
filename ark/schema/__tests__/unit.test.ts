import { attest, contextualize } from "@ark/attest"
import { assertNodeKind, registeredReference, rootSchema } from "@ark/schema"

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
		attest(T("bar")?.toString()).snap('must be "foo" (was "bar")')
		attest(T(5)?.toString()).snap('must be "foo" (was 5)')
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
		assertNodeKind(T.internal, "unit")
		// preserves the bigint for context
		attest(T.internal.errorContext).equals({
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
		assertNodeKind(T.internal, "unit")
		attest(T.json).snap({ unit: "undefined" })
		attest(T.internal.errorContext).equals({
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
		assertNodeKind(T.internal, "unit")
		// serializes to string for JSON
		attest(T.json).snap({ unit: "$ark.status" })
		// preserves the symbol for context
		attest(T.internal.errorContext).equals({
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
		assertNodeKind(T.internal, "unit")
		attest(T.json).snap({ unit: ref })
		attest(T.internal.errorContext).equals({
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
})

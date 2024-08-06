import { attest, contextualize } from "@ark/attest"
import { assertNodeKind, registeredReference, rootNode } from "@ark/schema"

contextualize(() => {
	it("string allows", () => {
		const t = rootNode({ unit: "foo" })
		attest(t.json).snap({ unit: "foo" })
		attest(t.allows("foo")).equals(true)
		attest(t.allows("bar")).equals(false)
	})

	it("string apply", () => {
		const t = rootNode({ unit: "foo" })
		attest(t.json).snap({ unit: "foo" })
		attest(t("foo")).equals("foo")
		attest(t("bar")?.toString()).snap('must be "foo" (was "bar")')
		attest(t(5)?.toString()).snap('must be "foo" (was 5)')
	})
	it("treats equivalent dates as equal", () => {
		const l = rootNode({ unit: new Date(1337) })
		const r = rootNode({ unit: new Date(1337) })
		attest(l.json).snap({ unit: "1970-01-01T00:00:01.337Z" })
		attest(l.json).equals(r.json)
		attest(l.equals(r)).equals(true)
	})

	it("bigint", () => {
		const t = rootNode({ unit: 7n })
		// serializes to string for JSON
		attest(t.json).snap({ unit: "7n" })
		assertNodeKind(t.internal, "unit")
		// preserves the bigint for context
		attest(t.internal.errorContext).equals({
			code: "unit",
			description: "7n",
			unit: 7n
		})
		attest(t.allows(6n)).equals(false)
		attest(t.allows(7n)).equals(true)
		attest(t.allows(8n)).equals(false)
	})

	it("undefined", () => {
		const t = rootNode({ unit: undefined })
		assertNodeKind(t.internal, "unit")
		attest(t.json).snap({ unit: "undefined" })
		attest(t.internal.errorContext).equals({
			code: "unit",
			description: "undefined",
			unit: undefined
		})
		attest(t.allows(null)).equals(false)
		attest(t.allows(undefined)).equals(true)
		attest(t.allows("undefined")).equals(false)
	})

	it("symbol", () => {
		// this symbol description should not be reused in other tests
		const status = Symbol("status")
		const t = rootNode({ unit: status })
		assertNodeKind(t.internal, "unit")
		// serializes to string for JSON
		attest(t.json).snap({ unit: "$ark.status" })
		// preserves the symbol for context
		attest(t.internal.errorContext).equals({
			code: "unit",
			description: "Symbol(status)",
			unit: status
		})
		attest(t.allows(status)).equals(true)
		attest(t.allows(Symbol("test"))).equals(false)
	})

	it("object reference", () => {
		const o = new Object()
		const ref = registeredReference(o)
		const t = rootNode({ unit: o })
		assertNodeKind(t.internal, "unit")
		attest(t.json).snap({ unit: ref })
		attest(t.internal.errorContext).equals({
			code: "unit",
			description: "{}",
			unit: o
		})
		attest(t.allows(o)).equals(true)
		attest(t.allows(new Object())).equals(false)
	})
})

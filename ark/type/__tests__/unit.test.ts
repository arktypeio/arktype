import { attest } from "@arktype/attest"
import { reference } from "@arktype/util"
import { node } from "../keywords/ark.js"

describe("unit", () => {
	it("treats equivalent dates as equal", () => {
		const l = node({ unit: new Date(1337) })
		const r = node({ unit: new Date(1337) })
		attest(l.json).snap({ unit: "1970-01-01T00:00:01.337Z" })
		attest(l.json).equals(r.json)
		attest(l.equals(r)).equals(true)
	})
	it("bigint", () => {
		const t = node({ unit: 7n })
		// serializes to string for JSON
		attest(t.json).snap({ unit: "7n" })
		// preserves the bigint for context
		attest(t.errorContext).equals({ code: "unit", description: "7n", unit: 7n })
		attest(t.allows(6n)).equals(false)
		attest(t.allows(7n)).equals(true)
		attest(t.allows(8n)).equals(false)
	})
	it("undefined", () => {
		const t = node({ unit: undefined })
		attest(t.json).snap({ unit: "undefined" })
		attest(t.errorContext).equals({
			code: "unit",
			description: "undefined",
			unit: undefined
		})
		attest(t.allows(null)).equals(false)
		attest(t.allows(undefined)).equals(true)
		attest(t.allows("undefined")).equals(false)
	})

	it("symbol", () => {
		const s = Symbol("test")
		const ref = reference(s)
		const t = node({ unit: s })
		// serializes to string for JSON
		attest(t.json).snap({ unit: ref })
		// preserves the symbol for context
		attest(t.errorContext).equals({
			code: "unit",
			description: "(symbol test)",
			unit: s
		})
		attest(t.allows(s)).equals(true)
		attest(t.allows(Symbol("test"))).equals(false)
	})

	it("object reference", () => {
		const o = new Object()
		const ref = reference(o)
		const t = node({ unit: o })
		attest(t.json).snap({ unit: ref })
		attest(t.errorContext).equals({ code: "unit", description: "{}", unit: o })
		attest(t.allows(o)).equals(true)
		attest(t.allows(new Object())).equals(false)
	})
})

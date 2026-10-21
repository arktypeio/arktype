import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"

contextualize(() => {
	it("const and enum", () => {
		const t = jsonSchemaToType({ const: "a", enum: ["a", "b"] })
		attest<"a">(t.infer)
		attest(t.expression).snap('"a"')
	})

	it("const outside enum", () => {
		const t = jsonSchemaToType({ const: "c", enum: ["a", "b"] })
		attest(t.expression).snap("never")
	})

	it("const outside type", () => {
		const t = jsonSchemaToType({ type: "string", const: 1 })
		attest(t.expression).snap("never")
	})

	it("structured const", () => {
		const t = jsonSchemaToType({ const: { a: [1, { b: null }] } })
		attest(t.allows({ a: [1, { b: null }] })).equals(true)
		attest(t.allows({ a: [1, { b: null }, 2] })).equals(false)
		attest(t.allows({ a: [1, { b: null, c: 0 }] })).equals(false)
	})

	it("structured enum", () => {
		const t = jsonSchemaToType({ enum: [[0], {}] })
		attest(t.allows([0])).equals(true)
		attest(t.allows({})).equals(true)
		attest(t.allows([])).equals(false)
		attest(t.allows({ a: 0 })).equals(false)
	})
})

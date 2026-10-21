import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"

contextualize(() => {
	it("empty schema", () => {
		const t = jsonSchemaToType({})
		attest(t.expression).snap("unknown")
	})

	it("true", () => {
		const t = jsonSchemaToType(true)
		attest(t.expression).snap("unknown")
	})

	it("annotations only", () => {
		const t = jsonSchemaToType({ description: "anything" })
		attest(t.expression).snap("unknown")
	})

	it("keywords constrain only their own type", () => {
		const t = jsonSchemaToType({
			properties: { a: { type: "string" } },
			required: ["a"],
			minLength: 2
		})
		attest(t.allows({ a: "x" })).equals(true)
		attest(t.allows({})).equals(false)
		attest(t.allows("ab")).equals(true)
		attest(t.allows("a")).equals(false)
		attest(t.allows([])).equals(true)
		attest(t.allows(null)).equals(true)
	})

	it("type list keeps keywords", () => {
		const t = jsonSchemaToType({
			type: ["object", "null"],
			properties: { a: { type: "string" } },
			required: ["a"]
		})
		attest(t.expression).snap("{ a: string } | null")
	})

	it("arrays are disjoint from an object branch", () => {
		const t = jsonSchemaToType({
			type: ["object", "array"],
			allOf: [{ type: "array" }]
		})
		attest(t.expression).snap("Array")
	})
})

import { attest, contextualize } from "@ark/attest"
import { parseJsonSchema } from "@ark/jsonschema"

// TODO: Add compound tests for objects (e.g. 'maxProperties' AND 'minProperties')

contextualize(() => {
	it("type object", () => {
		const t = parseJsonSchema({ type: "object" })
		attest(t.json).snap({ domain: "object" })
	})

	it("maxProperties", () => {
		const tMaxProperties = parseJsonSchema({
			type: "object",
			maxProperties: 1
		})
		attest(tMaxProperties.json).snap({ domain: "object" })
		attest(tMaxProperties.allows({})).equals(true)
		attest(tMaxProperties.allows({ foo: 1 })).equals(true)
		attest(tMaxProperties.allows({ foo: 1, bar: 2 })).equals(false)
		attest(tMaxProperties.allows({ foo: 1, bar: 2, baz: 3 })).equals(false)
	})

	it("minProperties", () => {
		const tMinProperties = parseJsonSchema({
			type: "object",
			minProperties: 2
		})
		attest(tMinProperties.json).snap({ domain: "object" })
		attest(tMinProperties.allows({})).equals(false)
		attest(tMinProperties.allows({ foo: 1 })).equals(false)
		attest(tMinProperties.allows({ foo: 1, bar: 2 })).equals(true)
		attest(tMinProperties.allows({ foo: 1, bar: 2, baz: 3 })).equals(true)
	})

	it("properties & required", () => {
		const tRequired = parseJsonSchema({
			type: "object",
			properties: {
				foo: { type: "string" },
				bar: { type: "number" }
			},
			required: ["foo"]
		})
		attest(tRequired.json).snap({
			domain: "object",
			required: [{ key: "foo", value: "string" }],
			optional: [{ key: "bar", value: "number" }]
		})

		attest(() => parseJsonSchema({ type: "object", required: ["foo"] })).throws(
			"'required' array is present but 'properties' object is missing"
		)
		attest(() =>
			parseJsonSchema({
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["bar"]
			})
		).throws(
			"Key 'bar' in 'required' array is not present in 'properties' object"
		)
		attest(() =>
			parseJsonSchema({
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo", "foo"]
			})
		).throws("Duplicate keys in 'required' array")
	})

	it("additionalProperties", () => {
		const tAdditionalProperties = parseJsonSchema({
			type: "object",
			additionalProperties: { type: "number" }
		})
		attest(tAdditionalProperties.json).snap({
			domain: "object",
			additional: "number"
		})
		attest(tAdditionalProperties.allows({})).equals(true)
		attest(tAdditionalProperties.allows({ foo: 1 })).equals(true)
		attest(tAdditionalProperties.allows({ foo: 1, bar: 2 })).equals(true)
		attest(tAdditionalProperties.allows({ foo: 1, bar: "2" })).equals(false)
	})

	it("patternProperties", () => {
		const tPatternProperties = parseJsonSchema({
			type: "object",
			patternProperties: {
				"^[a-z]+$": { type: "string" }
			}
		})
		attest(tPatternProperties.json).snap({
			domain: "object",
			pattern: [{ key: "^[a-z]+$", value: "string" }]
		})
		attest(tPatternProperties.allows({})).equals(true)
		attest(tPatternProperties.allows({ foo: "bar" })).equals(true)
		attest(tPatternProperties.allows({ foo: 1 })).equals(false)
		attest(tPatternProperties.allows({ "123": "bar" })).equals(false)
	})
})

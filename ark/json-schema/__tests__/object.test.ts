import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"

contextualize(() => {
	it("lists properties in output as the schema does", () => {
		const T = jsonSchemaToType({
			type: "object",
			properties: { b: { type: "string" }, a: { type: "string" } },
			required: ["a"]
		}).onUndeclaredKey("delete")
		attest(Object.keys(T({ a: "a", b: "b", c: "c" }))).snap(["b", "a"])
	})

	it("properties & required", () => {
		attest(
			jsonSchemaToType({
				type: "object",
				properties: { foo: { type: "string" }, bar: { type: "number" } },
				required: ["foo"]
			}).expression
		).snap("{ foo: string, bar?: number } & isNonArray")
		attest(
			jsonSchemaToType({
				type: "object",
				properties: { foo: { type: "string" } },
				// @ts-expect-error
				required: ["bar"]
			}).expression
		).snap("{ bar: unknown, foo?: string } & isNonArray")
		attest(() =>
			jsonSchemaToType({
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo", "foo"]
			})
		).throws.snap(
			'ParseError: #/required must be an array of unique strings (was ["foo","foo"])'
		)
	})

	it("patternProperties", () => {
		const T = jsonSchemaToType({
			type: "object",
			patternProperties: { "^[a-z]+$": { type: "string" } }
		})
		attest(T.expression).snap("{ [/^[a-z]+$/]: string } & isNonArray")
		// keys matching no pattern are allowed, since additionalProperties is unset
		attest(T.allows({ "123": 1 })).equals(true)
	})

	it("minProperties of 1 message", () => {
		const T = jsonSchemaToType({ type: "object", minProperties: 1 })
		attest(() => T.assert({})).throws.snap(
			"TraversalError: must be an object with at least 1 property (was an object)"
		)
	})

	it("required key declared by another branch", () => {
		const T = jsonSchemaToType({
			type: "object",
			allOf: [
				{ properties: { foo: { type: "string" } } },
				{ required: ["foo"] }
			]
		})
		attest(T.infer).type.toString.snap("{ foo: string }")
		attest(T.expression).snap("{ foo: string } & isNonArray")
	})

	it("required keys of untyped branches", () => {
		const T = jsonSchemaToType({
			type: "object",
			anyOf: [{ required: ["foo"] }, { required: ["bar"] }]
		})
		attest(T.infer).type.toString.snap("{ bar: unknown } | { foo: unknown }")
		attest(T.expression).snap(
			"{ bar: unknown } & isNonArray | { foo: unknown } & isNonArray"
		)
		attest(T.allows([])).equals(false)
	})
})

import { attest, contextualize } from "@ark/attest"
import { fromJsonSchema } from "arktype"

contextualize(() => {
	it("lists properties in output as the schema does", () => {
		const T = fromJsonSchema({
			type: "object",
			properties: { b: { type: "string" }, a: { type: "string" } },
			required: ["a"]
		}).onUndeclaredKey("delete")
		attest(Object.keys(T({ a: "a", b: "b", c: "c" }))).snap(["b", "a"])
	})

	it("properties & required", () => {
		attest(
			fromJsonSchema({
				type: "object",
				properties: { foo: { type: "string" }, bar: { type: "number" } },
				required: ["foo"]
			}).expression
		).snap("{ foo: string, bar?: number } & isNonArray")
		attest(
			fromJsonSchema({
				type: "object",
				properties: { foo: { type: "string" } },
				// @ts-expect-error
				required: ["bar"]
			}).expression
		).snap("{ bar: unknown, foo?: string } & isNonArray")
		attest(() =>
			fromJsonSchema({
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo", "foo"]
			})
		).throws.snap(
			'ParseError: #/required must be an array of unique strings (was ["foo","foo"])'
		)
	})

	it("patternProperties", () => {
		const T = fromJsonSchema({
			type: "object",
			patternProperties: { "^[a-z]+$": { type: "string" } }
		})
		attest(T.expression).snap("{ [/^[a-z]+$/]: string } & isNonArray")
		// keys matching no pattern are allowed, since additionalProperties is unset
		attest(T.allows({ "123": 1 })).equals(true)
	})

	it("minProperties of 1 message", () => {
		const T = fromJsonSchema({ type: "object", minProperties: 1 })
		attest(() => T.assert({})).throws.snap(
			"TraversalError: must be an object with at least 1 property"
		)
	})

	it("required key declared by another branch", () => {
		const T = fromJsonSchema({
			type: "object",
			allOf: [
				{ properties: { foo: { type: "string" } } },
				{ required: ["foo"] }
			]
		})
		attest(T.infer).type.toString.snap("{ foo: string }")
		attest(T.expression).snap("{ foo: string } & isNonArray")
	})

	it("a key Object.prototype has is a property only if it's own", () => {
		const Optional = fromJsonSchema({
			type: "object",
			properties: { toString: { type: "string" } }
		})
		attest(Optional.expression).snap("{ [/^toString$/]: string } & isNonArray")
		attest(Optional.allows({})).equals(true)
		attest(Optional.allows({ toString: "a" })).equals(true)
		attest(Optional.allows({ toString: 1 })).equals(false)

		const Required = fromJsonSchema({
			type: "object",
			properties: { constructor: {} },
			required: ["constructor"]
		})
		attest(Required.allows({})).equals(false)
		attest(Required.allows({ constructor: 1 })).equals(true)
		attest(() => Required.assert({})).throws.snap(
			"TraversalError: must be an object with its own constructor"
		)

		// declared, so additionalProperties doesn't apply to it
		const Closed = fromJsonSchema(
			JSON.parse(
				'{ "properties": { "__proto__": { "type": "number" } }, "additionalProperties": false }'
			)
		)
		attest(Closed.allows(JSON.parse('{ "__proto__": 1 }'))).equals(true)
		attest(Closed.allows(JSON.parse('{ "__proto__": "a" }'))).equals(false)
		attest(Closed.allows({ a: 1 })).equals(false)
	})

	it("required keys of untyped branches", () => {
		const T = fromJsonSchema({
			type: "object",
			anyOf: [{ required: ["foo"] }, { required: ["bar"] }]
		})
		attest(T.infer).type.toString.snap("{ bar: unknown } | { foo: unknown }")
		attest(T.expression).snap(
			"{ bar: unknown } & isNonArray | { foo: unknown } & isNonArray"
		)
		attest(T.allows([])).equals(false)
	})

	it("rejects functions and round-trips through toJsonSchema", () => {
		const T = fromJsonSchema({ type: "object" })
		for (let pass = 0; pass < 2; pass++) {
			attest(T.allows({})).equals(true)
			attest(T.allows(Object.create(null))).equals(true)
			attest(T.allows([])).equals(false)
			attest(T.allows(() => {})).equals(false)
			attest(T.allows(function fn() {})).equals(false)
			attest(T.allows(class C {})).equals(false)
		}
		attest(() => T.assert(() => {})).throws.snap(
			"TraversalError: must be not an array or function"
		)
		attest(T.toJsonSchema()).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			properties: {}
		})

		const WithProp = fromJsonSchema({
			type: "object",
			properties: { a: { type: "string" } },
			required: ["a"]
		})
		attest(WithProp.allows(Object.assign(() => {}, { a: "x" }))).equals(false)

		const ConstObj = fromJsonSchema({ const: { a: 1 } })
		attest(ConstObj.allows(Object.assign(() => {}, { a: 1 }))).equals(false)
	})
})

import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"

contextualize(() => {
	it("allOf", () => {
		const tAllOf = jsonSchemaToType({
			allOf: [
				{ type: "string", minLength: 1 },
				{ type: "string", maxLength: 10 }
			]
		})
		attest(tAllOf.expression).snap("string <= 10 & >= 1")
	})

	it("anyOf", () => {
		const tAnyOf = jsonSchemaToType({
			anyOf: [
				{ type: "string", minLength: 1 },
				{ type: "string", maxLength: 10 }
			]
		})
		attest(tAnyOf.expression).snap("string <= 10 | string >= 1")
	})

	it("not", () => {
		const tNot = jsonSchemaToType({ not: { type: "string", maxLength: 3 } })
		attest(tNot.json).snap({
			predicate: ["$ark.jsonSchemaNotValidator"]
		})

		attest(tNot.allows(123)).equals(true)
		attest(tNot.allows("1234")).equals(true)
		attest(() => tNot.assert("123")).throws(
			'TraversalError: must be not: a string and at most length 3 (was "123")'
		)
	})

	it("oneOf", () => {
		const tOneOf = jsonSchemaToType({
			oneOf: [{ type: "string", minLength: 10 }, { const: "foo" }]
		})
		attest(tOneOf.json).snap({
			predicate: ["$ark.jsonSchemaOneOfValidator"]
		})

		attest(tOneOf.allows("foo")).equals(true)
		attest(tOneOf.allows("1234567890")).equals(true)
		attest(() => tOneOf.assert("bar")).throws(
			'TraversalError: must be valid according to jsonSchemaOneOfValidator (was "bar")'
		)
	})
})

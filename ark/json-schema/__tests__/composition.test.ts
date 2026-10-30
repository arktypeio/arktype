import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"

contextualize(() => {
	it("allOf and anyOf reduce", () => {
		attest(
			jsonSchemaToType({
				allOf: [
					{ type: "string", minLength: 1 },
					{ type: "string", maxLength: 10 }
				]
			}).expression
		).snap("1 <= string <= 10")
		attest(
			jsonSchemaToType({
				anyOf: [
					{ type: "string", minLength: 1 },
					{ type: "string", maxLength: 10 }
				]
			}).expression
		).snap("string")
	})

	it("not", () => {
		const T = jsonSchemaToType({ not: { type: "string", maxLength: 3 } })
		attest(T.allows("1234")).equals(true)
		attest(() => T.assert("123")).throws.snap(
			'TraversalError: must be other than a string and at most length 3 (was "123")'
		)
	})

	it("oneOf of disjoint branches", () => {
		const T = jsonSchemaToType({
			oneOf: [{ type: "string", minLength: 10 }, { const: "foo" }]
		})
		attest(T.expression).snap('string >= 10 | "foo"')
		attest(() => T.assert("bar")).throws.snap(
			'TraversalError: must be at least length 10 or "foo" (was "bar")'
		)
	})

	it("then and else without if", () => {
		const T = jsonSchemaToType({ type: "string", then: false, else: false })
		attest<string>(T.infer)
		attest(T.expression).snap("string")
	})
})

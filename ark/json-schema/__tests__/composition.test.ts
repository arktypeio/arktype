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
		attest(tNot.allows(123)).equals(true)
		attest(tNot.allows("1234")).equals(true)
		attest(() => tNot.assert("123")).throws.snap(
			'TraversalError: must be not a string and at most length 3 (was "123")'
		)
	})

	it("oneOf", () => {
		const tOneOf = jsonSchemaToType({
			oneOf: [{ type: "string", minLength: 10 }, { const: "foo" }]
		})
		attest(tOneOf.expression).snap('string >= 10 | "foo"')

		attest(tOneOf.allows("foo")).equals(true)
		attest(tOneOf.allows("1234567890")).equals(true)
		attest(() => tOneOf.assert("bar")).throws.snap(
			'TraversalError: must be at least length 10 or "foo" (was "bar")'
		)
	})

	it("every composition keyword applies", () => {
		const T = jsonSchemaToType({
			allOf: [{ type: "string" }],
			anyOf: [{ minLength: 2 }, { const: "a" }],
			oneOf: [{ maxLength: 3 }, { minLength: 5 }],
			not: { const: "ab" }
		})
		attest(T.allows("a")).equals(true)
		attest(T.allows("ab")).equals(false)
		attest(T.allows("abc")).equals(true)
		attest(T.allows("abcd")).equals(false)
		attest(T.allows("abcde")).equals(true)
		attest(T.allows(1)).equals(false)
	})

	it("if/then/else", () => {
		const T = jsonSchemaToType({
			if: { type: "string" },
			then: { minLength: 2 },
			else: { type: "number" }
		})
		attest<unknown>(T.infer)
		attest(T.allows("ab")).equals(true)
		attest(T.allows(1)).equals(true)
		attest(T.allows("a")).equals(false)
		attest(T.allows(true)).equals(false)
	})

	it("then and else without if", () => {
		const T = jsonSchemaToType({ type: "string", then: false, else: false })
		attest<string>(T.infer)
		attest(T.expression).snap("string")
	})
})

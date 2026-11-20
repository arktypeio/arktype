import { attest, contextualize } from "@ark/attest"
import { fromJsonSchema } from "arktype"

contextualize(() => {
	it("allOf and anyOf reduce", () => {
		attest(
			fromJsonSchema({
				allOf: [
					{ type: "string", minLength: 1 },
					{ type: "string", maxLength: 10 }
				]
			}).expression
		).snap("1 <= string <= 10")
		attest(
			fromJsonSchema({
				anyOf: [
					{ type: "string", minLength: 1 },
					{ type: "string", maxLength: 10 }
				]
			}).expression
		).snap("string")
	})

	it("not", () => {
		const T = fromJsonSchema({ not: { type: "string", maxLength: 3 } })
		attest(T.allows("1234")).equals(true)
		attest(() => T.assert("123")).throws.snap(
			"TraversalError: must be other than a string and at most length 3"
		)
	})

	it("oneOf of disjoint branches", () => {
		const T = fromJsonSchema({
			oneOf: [{ type: "string", minLength: 10 }, { const: "foo" }]
		})
		attest(T.expression).snap('string >= 10 | "foo"')
		attest(() => T.assert("bar")).throws.snap(
			'TraversalError: must be at least length 10 or "foo"'
		)
	})

	it("then and else without if", () => {
		const T = fromJsonSchema({ type: "string", then: false, else: false })
		attest<string>(T.infer)
		attest(T.expression).snap("string")
	})
})

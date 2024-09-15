import { attest, contextualize } from "@ark/attest"
import {
	writeInvalidKeysMessage,
	writeNonStructuralOperandMessage
} from "@ark/schema"
import { scope, type } from "arktype"

contextualize(() => {
	it("parsed", () => {
		const types = scope({
			from: {
				foo: "1",
				"bar?": "1",
				baz: "1",
				"quux?": "1"
			},
			actual: "Pick<from, 'foo' | 'bar'>",
			expected: {
				foo: "1",
				"bar?": "1"
			}
		}).export()

		attest<typeof types.expected.t>(types.actual.t)
		attest(types.actual.expression).equals(types.expected.expression)
	})

	it("chained", () => {
		const user = type({
			name: "string",
			"age?": "number",
			isAdmin: "boolean"
		})

		const basicUser = user.pick("name", "age")

		const expected = type({
			name: "string",
			"age?": "number"
		})

		attest<typeof expected.t>(basicUser.t)

		attest(basicUser.expression).equals(expected.expression)
	})

	it("invalid key", () => {
		const user = type({
			name: "string"
		})

		// @ts-expect-error
		attest(() => user.pick("length"))
			.throws(writeInvalidKeysMessage(user.expression, ["length"]))
			.type.errors.snap(
				'Argument of type \'"length"\' is not assignable to parameter of type \'"name" | cast<"name">\'.'
			)
	})

	it("non-structure", () => {
		// @ts-expect-error
		attest(() => type("string").pick("length"))
			.throws(writeNonStructuralOperandMessage("pick", "string"))
			.type.errors("Property 'pick' does not exist")
	})
})

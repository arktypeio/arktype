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
		const User = type({
			name: "string",
			"age?": "number",
			isAdmin: "boolean"
		})

		const BasicUser = User.pick("name", "age")

		const Expected = type({
			name: "string",
			"age?": "number"
		})

		attest<typeof Expected.t>(BasicUser.t)

		attest(BasicUser.expression).equals(Expected.expression)
	})

	it("invalid key", () => {
		const User = type({
			name: "string"
		})

		// @ts-expect-error
		attest(() => User.pick("length"))
			.throws(writeInvalidKeysMessage(User.expression, ["length"]))
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

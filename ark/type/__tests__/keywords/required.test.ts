import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"

contextualize(() => {
	it("parsed", () => {
		const types = scope({
			user: {
				name: "string",
				"age?": "number"
			},
			actual: "Required<user>",
			expected: {
				name: "string",
				age: "number"
			}
		}).export()

		attest<typeof types.expected.t>(types.actual.t)
		attest(types.actual.expression).equals(types.expected.expression)
	})

	it("chained", () => {
		const t = type({
			"[string]": "number",
			foo: "1",
			"bar?": "1"
		}).required()

		attest<{
			[x: string]: number
			foo: 1
			bar: 1
		}>(t.t)

		attest(t.expression).snap("{ [string]: number, bar: 1, foo: 1 }")
	})

	// https://github.com/arktypeio/arktype/issues/1156
	it("with default", () => {
		const t = type({ foo: "string = 'bar'" }).required()

		const expected = type({
			foo: "string"
		})

		attest<typeof expected.t, typeof t.t>()

		attest(t.expression).equals(expected.expression)
	})
})

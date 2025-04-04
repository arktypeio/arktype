import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"

contextualize(() => {
	it("parsed", () => {
		const types = scope({
			user: {
				name: "string",
				"age?": "number"
			},
			actual: "Partial<user>",
			expected: {
				"name?": "string",
				"age?": "number"
			}
		}).export()

		attest<typeof types.expected.t>(types.actual.t)
		attest(types.actual.expression).equals(types.expected.expression)
	})

	it("chained", () => {
		const T = type({
			"[string]": "number",
			foo: "1",
			"bar?": "1"
		}).partial()

		attest<{
			// really this should just be number for the index signature, seems like a TS bug?
			[x: string]: number | undefined
			foo?: 1
			bar?: 1
		}>(T.t)

		attest(T.expression).snap("{ [string]: number, bar?: 1, foo?: 1 }")
	})
})

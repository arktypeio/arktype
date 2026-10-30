import { attest, contextualize } from "@ark/attest"
import { keywords, scope, type } from "arktype"

contextualize(() => {
	it("parsed", () => {
		const types = scope({
			from: {
				foo: "1",
				"bar?": "1",
				baz: "1",
				"quux?": "1"
			},
			actual: "Omit<from, 'foo' | 'bar'>",
			expected: {
				baz: "1",
				"quux?": "1"
			}
		}).export()

		attest<typeof types.expected.t>(types.actual.t)
		attest(types.actual.expression).equals(types.expected.expression)
	})

	it("invoked", () => {
		const T = keywords.Omit({ a: "string", b: "number" }, "'b'").and({
			c: "string"
		})

		attest<{ a: string; c: string }>(T.t)
		attest(T.expression).snap("{ a: string, c: string }")
	})

	it("chained", () => {
		const User = type({
			name: "string",
			"age?": "number",
			isAdmin: "boolean",
			"isActive?": "boolean"
		})

		const extras = User.omit("name", "age")

		const Expected = type({
			isAdmin: "boolean",
			"isActive?": "boolean"
		})

		attest<typeof Expected.t>(extras.t)

		attest(extras.expression).equals(Expected.expression)
	})
})

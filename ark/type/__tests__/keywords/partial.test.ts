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

	// https://github.com/arktypeio/arktype/issues/1480
	it("tuple literal", () => {
		const T = type(["'foo'", "'bar'"]).partial()
		const Expected = type(["'foo'?", "'bar'?"])

		attest<typeof Expected.t>(T.t)
		attest<["foo"?, "bar"?]>(T.infer)
		attest(T([])).equals([])
		attest(T(["foo"])).equals(["foo"])
		attest(T(["foo", "bar"])).equals(["foo", "bar"])
	})

	it("string syntax tuple", () => {
		const tupleScope = scope({
			tuple: ["'foo'", "'bar'"]
		})

		const T = tupleScope.type("Partial<tuple>")
		const Expected = type(["'foo'?", "'bar'?"])

		attest<typeof Expected.t>(T.t)
		attest<["foo"?, "bar"?]>(T.infer)
		attest(T.expression).equals(Expected.expression)
	})

	it("tuple with defaultable", () => {
		const T = type(["string", "number = 5"]).partial()
		const Expected = type(["string?", "number?"])

		// https://github.com/arktypeio/arktype/issues/1160
		// attest<typeof Expected.t>(T.t)
		attest(T.expression).equals(Expected.expression)
		attest(T([])).equals([])
	})
})

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
		const T = type({
			"[string]": "number",
			foo: "1",
			"bar?": "1"
		}).required()

		attest<{
			[x: string]: number
			foo: 1
			bar: 1
		}>(T.t)

		attest(T.expression).snap("{ [string]: number, bar: 1, foo: 1 }")
	})

	// https://github.com/arktypeio/arktype/issues/1156
	it("with default", () => {
		const T = type({ foo: "string = 'bar'" }).required()

		const Expected = type({
			foo: "string"
		})

		// https://github.com/arktypeio/arktype/issues/1160
		// attest<typeof Expected.t, typeof T.t>();

		attest(T.expression).equals(Expected.expression)
	})

	// reverse of https://github.com/arktypeio/arktype/issues/1480
	it("tuple literal", () => {
		const T = type(["'foo'?", "'bar'?"]).required()
		const Expected = type(["'foo'", "'bar'"])

		attest<typeof Expected.t>(T.t)
		attest<["foo", "bar"]>(T.infer)
		attest(T.expression).equals(Expected.expression)
		attest(T(["foo", "bar"])).equals(["foo", "bar"])
	})

	it("string syntax tuple", () => {
		const tupleScope = scope({
			tuple: ["'foo'?", "'bar'?"]
		})
		const T = tupleScope.type("Required<tuple>")
		const Expected = type(["'foo'", "'bar'"])

		attest<typeof Expected.t>(T.t)
		attest<["foo", "bar"]>(T.infer)
		attest(T.expression).equals(Expected.expression)
		attest(T(["foo", "bar"])).equals(["foo", "bar"])
	})

	it("tuple with defaultable", () => {
		const T = type(["string", "number = 5"]).required()
		const Expected = type(["string", "number"])

		// https://github.com/arktypeio/arktype/issues/1160
		// attest<typeof Expected.t>(T.t)
		attest(T.expression).equals(Expected.expression)
	})
})

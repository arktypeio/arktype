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

	it("tuple", () => {
		const T = type(["string", "number?"]).required()

		attest<[string, number]>(T.t)
		attest(T.expression).snap("[string, number]")
		attest(T(["foo"]).toString()).snap("must be exactly length 2 (was 1)")
	})

	it("empty tuple", () => {
		const T = type([]).required()

		attest<[]>(T.t)
		attest(T.expression).snap("[]")
	})
})

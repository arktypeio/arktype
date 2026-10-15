import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"
import type { Out, To } from "arktype/internal/attributes.ts"

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

		attest<typeof Expected.t, typeof T.t>()
		attest<{ foo: string }>(T.inferIn)
		attest(T.expression).equals(Expected.expression)
	})

	it("with defaulted morph", () => {
		const T = type({
			foo: ["string.numeric.parse", "=", "1"]
		}).required()

		attest<{ foo: (In: string) => To<number> }>(T.t)
		attest<{ foo: string }>(T.inferIn)
		attest(T({}).toString()).snap("foo must be a string (was missing)")
	})

	it("with morph", () => {
		const T = type({ foo: ["object", "=>", o => o] }).required()

		attest<{ foo: (In: object) => Out<object> }>(T.t)
	})

	it("with any input morph", () => {
		const T = type({ foo: ["unknown.any", "=>", () => 5] }).required()

		attest(T.t).type.toString.snap("{ foo: (In: any) => Out<number> }")
	})

	it("with never input morph", () => {
		const T = type({ foo: ["never", "=>", () => 5] }).required()

		attest<{ foo: (In: never) => Out<number> }>(T.t)
	})

	it("Required generic with default", () => {
		const types = scope({
			user: {
				name: "string = 'anonymous'",
				"age?": "number"
			},
			actual: "Required<user>",
			expected: {
				name: "string",
				age: "number"
			}
		}).export()

		attest<typeof types.expected.t>(types.actual.t)
		attest<typeof types.expected.inferIn>(types.actual.inferIn)
		attest(types.actual.expression).equals(types.expected.expression)
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

	it("tuple with defaultable", () => {
		const T = type(["string", "number = 5"]).required()

		attest<[string, number]>(T.t)
		attest<[string, number]>(T.inferIn)
		attest(T.expression).snap("[string, number]")
	})

	it("Required generic on a tuple", () => {
		const T = scope({ tuple: ["string", "number?"] }).type("Required<tuple>")

		attest<[string, number]>(T.t)
		attest(T.expression).snap("[string, number]")
	})
})

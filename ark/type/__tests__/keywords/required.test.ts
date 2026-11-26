import { attest, contextualize } from "@ark/attest"
import { writeInvalidKeysMessage } from "@ark/schema"
import { scope, type } from "arktype"
import type { Out, To } from "arktype/internal/attributes.ts"
import type { ArrayType } from "arktype/internal/variants/array.ts"

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
		attest(T(["foo"]).toString()).snap("must be exactly length 2")
	})

	it("tuple keeps array methods", () => {
		const T = type(["string", "number?", "...", "number[]"]).required()

		attest<ArrayType<[string, number, ...number[]]>>(T)
		const Bounded = T.atMostLength(3)
		attest<[string, number, ...number[]]>(Bounded.t)
		attest(Bounded.expression).snap("2 <= [string, ...number[]] <= 3")
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

	it("selective keys", () => {
		const Draft = type({
			"id?": "string",
			"title?": "string",
			"body?": "string",
			role: "'member' | 'admin' = 'member'"
		})

		const Titled = Draft.required("title")
		attest<{
			id?: string
			title: string
			body?: string
			role?: "member" | "admin"
		}>(Titled.inferIn)
		attest<{
			id?: string
			title: string
			body?: string
			role: "member" | "admin"
		}>(Titled.infer)
		attest(Titled.expression).snap(
			'{ title: string, body?: string, id?: string, role: "admin" | "member" = "member" }'
		)
		attest(Titled({ title: "Hi" })).equals({ title: "Hi", role: "member" })
		attest(Titled({}).toString()).snap("title must be a string (was missing)")

		const WithRole = Draft.required("id", "role")
		attest<{
			id: string
			title?: string
			body?: string
			role: "member" | "admin"
		}>(WithRole.inferIn)
		attest<{
			id: string
			title?: string
			body?: string
			role: "member" | "admin"
		}>(WithRole.infer)
		attest(WithRole({ id: "1" }).toString()).snap(
			'role must be "admin" or "member" (was missing)'
		)
	})

	it("selective key with defaulted morph", () => {
		const T = type({
			a: ["string.numeric.parse", "=", "1"],
			b: ["string.numeric.parse", "=", "2"]
		}).required("a")

		attest<{ a: string; b?: string }>(T.inferIn)
		attest<{ a: number; b: number }>(T.infer)
		attest(T({ a: "5" })).equals({ a: 5, b: 2 })
		attest(T({}).toString()).snap("a must be a string (was missing)")
	})

	it("selective key already required is a runtime no-op", () => {
		const Base = type({
			a: "string",
			"b?": "number"
		}).narrow(o => o.a.length > 0)

		const SameA = Base.required("a")
		attest(SameA.internal).is(Base.internal)
		attest(SameA({ a: "" }).toString()).snap(
			"must be valid according to an anonymous predicate"
		)
	})

	it("selective keys with symbol and type.cast", () => {
		const s = Symbol("tag")
		const T = type({
			[s]: "string?",
			"a?": "number",
			"b?": "boolean"
		})

		const ReqSym = T.required(s)
		attest<{ [s]: string; a?: number; b?: boolean }>(ReqSym.infer)
		attest(ReqSym({ [s]: "x" })).equals({ [s]: "x" })
		attest(ReqSym({}).toString()).snap(
			"[Symbol(tag)] must be a string (was missing)"
		)

		const ReqCast = T.required(type.enumerated("a", "b"))
		attest<{ [s]?: string; a: number; b: boolean }>(ReqCast.infer)
		attest(ReqCast({ a: 1, b: true })).equals({ a: 1, b: true })
	})

	it("selective keys on union of objects", () => {
		const U = type({ "kind?": "'a'", x: "string" })
			.or({ "kind?": "'b'", y: "number" })
			.required("kind")

		attest<{ kind: "a"; x: string } | { kind: "b"; y: number }>(U.infer)
		attest(U({ kind: "a", x: "hi" })).equals({ kind: "a", x: "hi" })
		attest(U({ x: "hi" }).toString()).snap('kind must be "a" or "b"')
	})

	it("selective required drops undefined under exactOptionalPropertyTypes: false", () => {
		const loose = scope({}, { exactOptionalPropertyTypes: false })
		const T = loose.type({ "a?": "string", "b?": "string" }).required("a")
		attest(T.expression).snap("{ a: string, b?: string | undefined }")
		attest(T.allows({ a: "ok", b: undefined })).equals(true)
		attest(T.allows({ a: undefined })).equals(false)
	})

	it("selective invalid key", () => {
		const Draft = type({ "title?": "string" })
		// @ts-expect-error
		attest(() => Draft.required("body"))
			.throws(writeInvalidKeysMessage(Draft.expression, ["body"]))
			.type.errors.snap(
				'Argument of type \'"body"\' is not assignable to parameter of type \'"title" | cast<"title">\'.'
			)

		// @ts-expect-error
		attest(() => type(["string", "number?"]).required("1"))
			.throws(writeInvalidKeysMessage("[string, number?]", ["1"]))
			.type.errors.snap(
				`Type '"1"' has no properties in common with type 'cast<never>'.`
			)

		// @ts-expect-error
		attest(() => type("Date").required("getTime"))
			.throws(writeInvalidKeysMessage("{}", ["getTime"]))
			.type.errors.snap(
				`Type '"getTime"' has no properties in common with type 'cast<never>'.`
			)
	})
})

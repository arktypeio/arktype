import { attest, contextualize } from "@ark/attest"
import { writeInvalidKeysMessage } from "@ark/schema"
import { scope, type } from "arktype"
import type { ArrayType } from "arktype/internal/variants/array.ts"

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

	it("tuple", () => {
		const T = type(["string", "number"]).partial()

		attest<[string?, number?]>(T.t)
		attest(T.expression).snap("[string?, number?]")
		attest(T([])).equals([])
		attest(T(["foo"])).equals(["foo"])
		attest(T({}).toString()).snap("must be an array")
	})

	it("tuple keeps array methods", () => {
		const T = type(["string", "number"]).partial()

		attest<ArrayType<[string?, number?]>>(T)
		const NonEmpty = T.atLeastLength(1)
		attest<[string?, number?]>(NonEmpty.t)
		attest(NonEmpty([]).toString()).snap("must be non-empty")
	})

	it("array is unaffected", () => {
		// like the index signature above, TS unions a variadic element with
		// undefined since it has no way to represent an optional one. in
		// ArkType, optionality is about presence rather than the values an
		// element allows, so the type is unchanged.
		const T = type("string[]").partial()

		attest<(string | undefined)[]>(T.t)
		attest(T.expression).snap("string[]")
		attest(T([undefined]).toString()).snap("[0] must be a string")
	})

	it("preserves defaultable elements", () => {
		const T = type(["number = 5"]).partial()

		attest(T.expression).snap("[number = 5]")
	})

	it("postfix element", () => {
		// TS folds postfix elements into the variadic here, which would allow
		// values the original tuple never did
		attest(() =>
			type(["string", "...", "number[]", "boolean"]).partial()
		).throws.snap(
			"ParseError: A postfix required element cannot follow an optional or defaultable element"
		)
	})

	it("tuple with defaultable", () => {
		// the prefix can only become optional if the defaultable after it does too
		const T = type(["string", "number = 5"]).partial()

		attest(T.expression).snap("[string?, number?]")
		attest(T([])).equals([])
	})

	it("Partial generic on a tuple", () => {
		const T = scope({ tuple: ["string", "number"] }).type("Partial<tuple>")

		attest<[string?, number?]>(T.t)
		attest(T.expression).snap("[string?, number?]")
	})

	it("selective keys", () => {
		const User = type({
			id: "string",
			name: "string",
			"age?": "number",
			role: "'member' | 'admin' = 'member'"
		})

		const PartialName = User.partial("name")
		attest<{
			id: string
			name?: string
			age?: number
			role?: "member" | "admin"
		}>(PartialName.inferIn)
		attest<{
			id: string
			name?: string
			age?: number
			role: "member" | "admin"
		}>(PartialName.infer)
		attest(PartialName.expression).snap(
			'{ id: string, age?: number, name?: string, role: "admin" | "member" = "member" }'
		)
		attest(PartialName({ id: "1" })).equals({ id: "1", role: "member" })
		attest(PartialName({}).toString()).snap("id must be a string (was missing)")

		const PartialMulti = User.partial("id", "name")
		attest<{
			id?: string
			name?: string
			age?: number
			role: "member" | "admin"
		}>(PartialMulti.infer)
		attest(PartialMulti({})).equals({ role: "member" })
	})

	it("selective key already optional or defaulted is a runtime no-op", () => {
		const Narrowed = type({
			a: "string",
			"b?": "number"
		}).narrow(o => o.a.length > 0)

		const SameB = Narrowed.partial("b")
		attest(SameB.internal).is(Narrowed.internal)
		attest(SameB({ a: "" }).toString()).snap(
			"must be valid according to an anonymous predicate"
		)

		const WithDefault = type({
			a: "string",
			c: "boolean = true",
			m: ["string.numeric.parse", "=", "1"]
		})
		const SameC = WithDefault.partial("c")
		attest(SameC.internal).is(WithDefault.internal)
		attest<{ a: string; c?: boolean; m?: string }>(SameC.inferIn)
		attest<{ a: string; c: boolean; m: number }>(SameC.infer)
		attest(SameC({ a: "ok" })).equals({ a: "ok", c: true, m: 1 })

		const SameM = WithDefault.partial("m")
		attest(SameM.internal).is(WithDefault.internal)
		attest<{ a: string; c?: boolean; m?: string }>(SameM.inferIn)
		attest<{ a: string; c: boolean; m: number }>(SameM.infer)
		attest(SameM({ a: "ok" })).equals({ a: "ok", c: true, m: 1 })

		const WithNever = type({ a: "never", b: "string" }).partial("a")
		attest<{ a?: never; b: string }>(WithNever.infer)
		attest<{ a?: never; b: string }>(WithNever.inferIn)
		attest(WithNever({ b: "ok" })).equals({ b: "ok" })

		const WithDefaultAny = type({
			a: ["unknown.any", "=", "x"],
			c: "string"
		}).partial("a")
		attest<{ a?: any; c: string }>(WithDefaultAny.inferIn)
		attest<{ a: any; c: string }>(WithDefaultAny.infer)
		attest(WithDefaultAny({ c: "ok" })).equals({ a: "x", c: "ok" })
	})

	it("selective keys with symbol and type.cast", () => {
		const s = Symbol("tag")
		const T = type({
			[s]: "string",
			a: "number",
			b: "boolean"
		})

		const PartialSym = T.partial(s)
		attest<{ [s]?: string; a: number; b: boolean }>(PartialSym.infer)
		attest(PartialSym({ a: 1, b: true })).equals({ a: 1, b: true })

		const PartialCast = T.partial(type.enumerated("a", "b"))
		attest<{ [s]: string; a?: number; b?: boolean }>(PartialCast.infer)
		attest(PartialCast({ [s]: "x" })).equals({ [s]: "x" })
	})

	it("selective keys with index signature and undeclared key behavior", () => {
		const T = type({
			"+": "reject",
			"[string]": "number",
			foo: "1",
			bar: "1"
		}).partial("foo")

		attest<{
			[x: string]: number
			foo?: 1
			bar: 1
		}>(T.infer)
		attest(T.expression).snap(
			"{ [string]: number, bar: 1, foo?: 1, + (undeclared): reject }"
		)
	})

	it("selective keys on union of objects", () => {
		const U = type({ kind: "'a'", x: "string" })
			.or({ kind: "'b'", y: "number" })
			.partial("kind")

		attest<{ kind?: "a"; x: string } | { kind?: "b"; y: number }>(U.infer)
		attest(U({ x: "hi" })).equals({ x: "hi" })
		attest(U({ y: 42 })).equals({ y: 42 })
	})

	it("selective partial on array with intersected props preserves array type", () => {
		const T = type("string[]")
			.and({ extra: "number", keep: "string" })
			.partial("extra")
			.atLeastLength(1)

		attest<string[] & { keep: string; extra?: number }>(T.infer)
		const valid = Object.assign(["a"], { keep: "ok" })
		attest(T(valid)).equals(valid)
		attest(T(["a"]).toString()).snap("keep must be a string (was missing)")
		attest(T(Object.assign([], { keep: "ok" })).toString()).snap(
			"must be non-empty"
		)

		// tuple with intersected props preserves exact tuple base without leaking length
		const Tuple = type(["string", "number"])
			.and({ extra: "number", keep: "string" })
			.partial("extra")
		attest<[string, number] & { keep: string; extra?: number }>(Tuple.infer)
		const validTuple = Object.assign(["a", 1] as [string, number], {
			keep: "ok"
		})
		attest(Tuple(validTuple)).equals(validTuple)

		// tuple with multiple optional elements preserves distinct element types
		const MultiOptTuple = type(["string", "number?", "boolean?"])
			.and({ extra: "number", keep: "string" })
			.partial("extra")
		attest<[string, number?, boolean?] & { keep: string; extra?: number }>(
			MultiOptTuple.infer
		)

		// array | object union distributes array handling per branch
		const Mixed = type("string[]")
			.and({ kind: "'arr'", a: "number" })
			.or({ kind: "'obj'", a: "number" })
			.partial("a")
		attest<
			(string[] & { kind: "arr"; a?: number }) | { kind: "obj"; a?: number }
		>(Mixed.infer)
		const validArr = Object.assign(["x"], { kind: "arr" as const })
		attest(Mixed(validArr)).equals(validArr)
		attest(Mixed({ kind: "obj" })).equals({ kind: "obj" })

		// branded array with intersected props preserves Brand
		const Branded = type("string[]")
			.brand("tag")
			.and({ a: "string", b: "number" })
			.partial("a")
		attest(Branded.infer).type.toString.snap(`string[] & {
	readonly " brand": [string[], "tag"]
	a?: string
	b: number
}`)
	})

	it("selective invalid key", () => {
		const User = type({ name: "string" })
		// @ts-expect-error
		attest(() => User.partial("age"))
			.throws(writeInvalidKeysMessage(User.expression, ["age"]))
			.type.errors.snap(
				'Argument of type \'"age"\' is not assignable to parameter of type \'"name" | cast<"name">\'.'
			)

		// @ts-expect-error
		attest(() => type(["string", "number"]).partial("0"))
			.throws(writeInvalidKeysMessage("[string, number]", ["0"]))
			.type.errors.snap(
				`Type '"0"' has no properties in common with type 'cast<never>'.`
			)

		// @ts-expect-error
		attest(() => type("Date").partial("getTime"))
			.throws(writeInvalidKeysMessage("{}", ["getTime"]))
			.type.errors.snap(
				`Type '"getTime"' has no properties in common with type 'cast<never>'.`
			)
	})
})

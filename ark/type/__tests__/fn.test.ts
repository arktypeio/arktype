import { attest, contextualize } from "@ark/attest"
import { postfixAfterOptionalOrDefaultableMessage } from "@ark/schema"
import { type } from "arktype"
import { badFnReturnTypeMessage, type TypedFn } from "arktype/internal/fn.ts"
import type { Return } from "arktype/internal/nary.ts"
import {
	multipleVariadicMesage,
	optionalOrDefaultableAfterVariadicMessage
} from "arktype/internal/parser/tupleLiteral.ts"

contextualize(() => {
	it("0 params implicit return", () => {
		const f = type.fn()(() => 5)

		attest<TypedFn<() => number>>(f)

		attest(f()).equals(5)

		attest(f.expression).snap("() => unknown")
	})

	it("0 params explicit return", () => {
		const f = type.fn(":", "5")(() => 5)

		attest<TypedFn<() => 5, {}, Return.introspectable>>(f)

		attest(f()).equals(5)

		attest(f.expression).snap("() => 5")
	})

	it("1 param implicit return", () => {
		const len = type.fn("string | number[]")(s => s.length)

		attest<TypedFn<(s: string) => number>>(len)

		attest(len.expression).snap("(string | number[]) => unknown")

		attest(len("foo")).equals(3)

		// @ts-expect-error
		attest(() => len(1)).throws.snap(
			"TraversalError: value at [0] must be a string or an object (was a number)"
		)
	})

	it("1 param explicit return", () => {
		const len = type.fn("string | unknown[]", ":", "number")(s => s.length)

		attest<TypedFn<(s: string) => number, {}, Return.introspectable>>(len)

		attest(len.expression).snap("(string | Array) => number")

		attest(len("foo")).equals(3)

		// @ts-expect-error
		attest(() => len(1)).throws.snap(
			"TraversalError: value at [0] must be a string or an object (was a number)"
		)
	})

	it("2 params implicit return", () => {
		const isNumericEquivalent = type.fn(
			"string",
			"number"
		)((s, n) => s === `${n}`)

		attest<TypedFn<(s: string, n: number) => boolean>>(isNumericEquivalent)

		attest(isNumericEquivalent.expression).snap("(string, number) => unknown")

		attest(isNumericEquivalent("5", 5)).equals(true)
	})

	it("2 params explicit return", () => {
		const isNumericEquivalent = type.fn(
			"string",
			"number",
			":",
			"boolean"
		)((s, n) => s === `${n}`)

		attest<
			TypedFn<(s: string, n: number) => boolean, {}, Return.introspectable>
		>(isNumericEquivalent)

		attest(isNumericEquivalent.expression).snap("(string, number) => boolean")

		attest(isNumericEquivalent("5", 5)).equals(true)
	})

	it("morphs", () => {
		const stringToLength = type.string.pipe(function _fnStringToLength(s) {
			return s.length
		}, type.number)

		const f = type.fn(stringToLength, ":", stringToLength)(n => n.toFixed(2))
		attest<TypedFn<(n: string) => number, {}, Return.introspectable>>(f)
		attest(f.expression).snap(
			"((In: string) => To<number>) => (In: string) => To<number>"
		)
	})

	it("nary inferred return", () => {
		const f = type.fn(
			{ a: "1" },
			{ b: "2" },
			{ c: "3" },
			{ d: "4" },
			{ e: "5" },
			{ f: "6" },
			{ g: "7" },
			{ h: "8" },
			{ i: "9" },
			{ j: "10" },
			{ k: "11" },
			{ l: "12" },
			{ m: "13" },
			{ n: "14" },
			{ o: "15" },
			{ p: "16" },
			{ q: "17" }
		)((a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q) => ({
			...a,
			...b,
			...c,
			...d,
			...e,
			...f,
			...g,
			...h,
			...i,
			...j,
			...k,
			...l,
			...m,
			...n,
			...o,
			...p,
			...q
		}))

		attest(f.expression).snap(
			"({ a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }, { e: 5 }, { f: 6 }, { g: 7 }, { h: 8 }, { i: 9 }, { j: 10 }, { k: 11 }, { l: 12 }, { m: 13 }, { n: 14 }, { o: 15 }, { p: 16 }, { q: 17 }) => unknown"
		)

		attest(f).type.toString.snap(`TypedFn<
	(
		a: { a: 1 },
		b: { b: 2 },
		c: { c: 3 },
		d: { d: 4 },
		e: { e: 5 },
		f: { f: 6 },
		g: { g: 7 },
		h: { h: 8 },
		i: { i: 9 },
		j: { j: 10 },
		k: { k: 11 },
		l: { l: 12 },
		m: { m: 13 },
		n: { n: 14 },
		o: { o: 15 },
		p: { p: 16 },
		q: { q: 17 }
	) => {
		q: 17
		p: 16
		o: 15
		n: 14
		m: 13
		l: 12
		k: 11
		j: 10
		i: 9
		h: 8
		g: 7
		f: 6
		e: 5
		d: 4
		c: 3
		b: 2
		a: 1
	},
	{},
	{}
>`)
	})

	it("nary declared return", () => {
		const f = type.fn(
			{ a: "1" },
			{ b: "2" },
			{ c: "3" },
			{ d: "4" },
			{ e: "5" },
			{ f: "6" },
			{ g: "7" },
			{ h: "8" },
			{ i: "9" },
			{ j: "10" },
			{ k: "11" },
			{ l: "12" },
			{ m: "13" },
			{ n: "14" },
			{ o: "15" },
			":",
			{ p: "16" }
		)((a, b, c, d, e, f, g, h, i, j, k, l, m, n, o) => ({
			...a,
			...b,
			...c,
			...d,
			...e,
			...f,
			...g,
			...h,
			...i,
			...j,
			...k,
			...l,
			...m,
			...n,
			...o,
			p: 16
		}))

		attest(f.expression).snap(
			"({ a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }, { e: 5 }, { f: 6 }, { g: 7 }, { h: 8 }, { i: 9 }, { j: 10 }, { k: 11 }, { l: 12 }, { m: 13 }, { n: 14 }, { o: 15 }) => { p: 16 }"
		)

		attest(f).type.toString.snap(`TypedFn<
	(
		a: { a: 1 },
		b: { b: 2 },
		c: { c: 3 },
		d: { d: 4 },
		e: { e: 5 },
		f: { f: 6 },
		g: { g: 7 },
		h: { h: 8 },
		i: { i: 9 },
		j: { j: 10 },
		k: { k: 11 },
		l: { l: 12 },
		m: { m: 13 },
		n: { n: 14 },
		o: { o: 15 }
	) => { p: 16 },
	{},
	introspectable
>`)
	})

	it("signature precedence implicit return", () => {
		const f = type.fn("string")((v: string | number): 0 | 1 =>
			v === "foo" ? 1 : 0
		)

		// signature should be wider from the declaration with name "v" from implementation
		// 0 | 1 should be inferred from output since undeclared
		attest(f).type.toString.snap()
	})

	it("signature precedence explicit return", () => {
		const f = type.fn(
			"string",
			":",
			"number"
		)((v: string | number): 0 | 1 => (v === "foo" ? 1 : 0))

		// signature should be wider from the declaration with name "v" from implementation
		attest(f).type.toString.snap(
			"TypedFn<(v: string) => number, {}, introspectable>"
		)
	})

	it("attached params", () => {
		const len = type.fn("string | unknown[]")(s => s.length)

		const expectedParams = type(["string | unknown[]"])

		attest<typeof expectedParams>(len.params)
		attest(len.params.expression).equals(expectedParams.expression)
	})

	it("inferred returns", () => {
		const len = type.fn("string | unknown[]")(s => s.length)

		const Expected = type.unknown
		attest<typeof Expected>(len.returns)
		attest(len.returns.expression).equals(Expected.expression)
	})

	it("introspectable returns", () => {
		const len = type.fn("string | unknown[]", ":", "number")(s => s.length)

		const Expected = type.number
		attest<typeof Expected>(len.returns)
		attest(len.returns.expression).equals(Expected.expression)
	})

	it("missing return", () => {
		// the type message just ends up being some overload nonsense
		// but hopefully people will not try to do this and get confused
		// @ts-expect-error
		attest(() => type.fn("string", ":")).throws(badFnReturnTypeMessage)
	})

	it("name", () => {
		const f = type.fn("string")(function originalName() {})
		attest(f.name).snap("bound typed originalName")
	})

	it("arg submodule completions", () => {
		// @ts-expect-error
		attest(() => type.fn("string.nu")).completions({
			"string.nu": ["string.numeric"]
		})

		// @ts-expect-error
		attest(() => type.fn("boolean", "string.nu")).completions({
			"string.nu": ["string.numeric"]
		})
	})

	it("arg object completions", () => {
		attest(() =>
			type.fn({
				// @ts-expect-error
				a: "str"
			})
		).completions({
			str: ["string"]
		})

		attest(() =>
			type.fn(
				{
					a: "string"
				},
				{
					// @ts-expect-error
					b: "boo"
				}
			)
		).completions({
			boo: ["boolean"]
		})
	})

	it("returns submodule completions", () => {
		// @ts-expect-error
		attest(() => type.fn(":", "string.nu")).completions({
			"string.nu": ["string.numeric"]
		})

		// @ts-expect-error
		attest(() => type.fn("boolean", ":", "string.nu")).completions({
			"string.nu": ["string.numeric"]
		})
	})

	it("returns object completions", () => {
		attest(() =>
			type.fn(":", {
				// @ts-expect-error
				a: "str"
			})
		).completions({
			str: ["string"]
		})

		attest(() =>
			type.fn(
				{
					a: "string"
				},
				":",
				{
					// @ts-expect-error
					b: "boo"
				}
			)
		).completions({
			boo: ["boolean"]
		})
	})

	describe("scoped", () => {
		it("scoped param and return", () => {
			const $ = type.scope({
				xxx: "string",
				zzz: "number"
			})

			const f = $.type.fn("xxx", ":", "zzz")(s => s.length)

			attest<TypedFn<(s: string) => number, typeof $.t, Return.introspectable>>(
				f
			)

			attest(f("foo")).equals(3)

			attest(f.expression).snap("(string) => number")

			// @ts-expect-error
			attest(() => f(null))
				.throws.snap("TraversalError: value at [0] must be a string (was null)")
				.type.errors.snap(
					"Argument of type 'null' is not assignable to parameter of type 'string'."
				)
		})

		it("completions", () => {
			const $ = type.scope({
				xxx: "string",
				zzz: "number"
			})

			// @ts-expect-error
			attest(() => $.type.fn("zz", ":", "xx")).completions({
				zz: ["zzz"],
				xx: ["xxx"]
			})
		})
	})

	describe("tuple elements", () => {
		it("defaultable and optional", () => {
			const f = type.fn(
				"string",
				"number = 5",
				"boolean?"
			)((s, n, b) => `${s}${n}${b}`)

			attest(f.expression).snap("(string, number = 5, boolean?) => unknown")
		})

		it("non-variadic array", () => {
			const join = type.fn("string[]")((...parts) => parts.join(","))

			attest(join.expression).snap("(string[]) => unknown")
		})

		it("variadic array", () => {
			const join = type.fn(
				"...",
				"string[]",
				":",
				"string"
			)((...parts) => parts.join(","))

			attest(join.expression).snap("(...string[]) => string")
		})

		it("intro example", () => {
			const safe = type.fn(
				"string",
				"number = 0.1"
			)((name, version) => `${name}@${version} is safe AF.`)

			attest(safe("arktype", 2.2)).snap("arktype@2.2 is safe AF.")
			attest(() => safe("shitescript", "*" as any)).throws.snap(
				"TraversalError: value at [1] must be a number (was a string)"
			)
		})

		describe("errors", () => {
			it("errors on multiple variadic", () => {
				attest(() =>
					// @ts-expect-error
					type.fn("...", "string[]", "...", "number[]")(() => {})
				).throwsAndHasTypeError(multipleVariadicMesage)
			})

			it("error on optional post-variadic in spread", () => {
				// no type error yet, ideally would have one if tuple
				// parsing were more precise for nested spread tuples
				attest(() =>
					type.fn("...", "string[]", "...", ["string?"])(() => {})
				).throws(optionalOrDefaultableAfterVariadicMessage)
			})

			it("errors on postfix following optional", () => {
				attest(() =>
					// @ts-expect-error
					type.fn("number?", "...", "boolean[]", "symbol")(() => {})
				).throwsAndHasTypeError(postfixAfterOptionalOrDefaultableMessage)
			})

			it("errors on postfix following defaultable", () => {
				attest(() =>
					// @ts-expect-error
					type.fn("number = 0", "...", "boolean[]", "symbol")(() => {})
				).throwsAndHasTypeError(postfixAfterOptionalOrDefaultableMessage)
			})
		})
	})
})

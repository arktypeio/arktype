import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import { badFnReturnTypeMessage, type TypedFn } from "arktype/internal/fn.ts"
import type { Return } from "arktype/internal/nary.ts"

contextualize(() => {
	const f = type.fn("string", "number = 5", "boolean?")((s, n, b) => true)

	const ss = type.fn("...", "string[]")

	const zz = ss((s, n, b) => true)

	it("0 paams implicit return", () => {
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

		attest(len.expression).snap("(a: string | Array) => unknown")

		attest(len("foo")).equals(3)

		// @ts-expect-error
		attest(() => len(1)).throws.snap(
			"TraversalError: must be a string or an object (was a number)"
		)
	})

	it("1 param explicit return", () => {
		const len = type.fn("string | unknown[]", ":", "number")(s => s.length)

		attest<TypedFn<(s: string) => number, {}, Return.introspectable>>(len)

		attest(len.expression).snap("(a: string | Array) => number")

		attest(len("foo")).equals(3)

		// @ts-expect-error
		attest(() => len(1)).throws.snap(
			"TraversalError: must be a string or an object (was a number)"
		)
	})

	it("2 params implicit return", () => {
		const isNumericEquivalent = type.fn(
			"string",
			"number"
		)((s, n) => s === `${n}`)

		attest<TypedFn<(s: string, n: number) => boolean>>(isNumericEquivalent)

		attest(isNumericEquivalent.expression).snap(
			"(a: string, b: number) => unknown"
		)

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

		attest(isNumericEquivalent.expression).snap(
			"(a: string, b: number) => boolean"
		)

		attest(isNumericEquivalent("5", 5)).equals(true)
	})

	it("morphs", () => {
		const stringToLength = type.string.pipe(function _fnStringToLength(s) {
			return s.length
		}, type.number)

		const f = type.fn(stringToLength, ":", stringToLength)(n => n.toFixed(2))
		attest<TypedFn<(n: string) => number, {}, Return.introspectable>>(f)
		attest(f.expression).snap(
			"(a: (In: string) => To<number>) => (In: string) => To<number>"
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
			"(a: { a: 1 }, b: { b: 2 }, c: { c: 3 }, d: { d: 4 }, e: { e: 5 }, f: { f: 6 }, g: { g: 7 }, h: { h: 8 }, i: { i: 9 }, j: { j: 10 }, k: { k: 11 }, l: { l: 12 }, m: { m: 13 }, n: { n: 14 }, o: { o: 15 }, p: { p: 16 }, q: { q: 17 }) => unknown"
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
			"(a: { a: 1 }, b: { b: 2 }, c: { c: 3 }, d: { d: 4 }, e: { e: 5 }, f: { f: 6 }, g: { g: 7 }, h: { h: 8 }, i: { i: 9 }, j: { j: 10 }, k: { k: 11 }, l: { l: 12 }, m: { m: 13 }, n: { n: 14 }, o: { o: 15 }) => { p: 16 }"
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
		attest(f).type.toString.snap("TypedFn<(v: string) => 0 | 1, {}, {}>")
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

		const expectedParam = type("string | unknown[]")

		attest<[typeof expectedParam]>(len.params)
		attest(len.params.length).equals(1)
		attest(len.params[0].expression).equals(expectedParam.expression)
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

			attest(f.expression).snap("(a: string) => number")

			// @ts-expect-error
			attest(() => f(null))
				.throws.snap("TraversalError: must be a string (was null)")
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
})

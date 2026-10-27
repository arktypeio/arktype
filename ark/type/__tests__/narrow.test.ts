import { attest, contextualize } from "@ark/attest"
import {
	registeredReference,
	writeUnsatisfiableExpressionError,
	type Traversal
} from "@ark/schema"
import type { equals } from "@ark/util"
import { scope, type } from "arktype"
import type { Out } from "arktype/internal/attributes.ts"

contextualize(() => {
	it("implicit problem", () => {
		const isOdd = (n: number) => n % 2 === 1
		const isOddRef = registeredReference(isOdd)
		const Odd = type(["number", ":", isOdd])
		attest<number>(Odd.infer)
		attest(Odd.json).equals({ domain: "number", predicate: [isOddRef] })
		attest(Odd(1)).equals(1)
		attest(Odd(2).toString()).snap("must be valid according to isOdd (was 2)")
	})

	it("error references its predicate", () => {
		const isOdd = (n: number) => n % 2 === 1
		const Odd = type("number").narrow(isOdd)
		const error = (Odd(2) as type.errors).issues[0]
		if (error.code !== "predicate") throw new Error()
		attest(error.predicate).is(isOdd)
		attest(error.message).snap("must be valid according to isOdd (was 2)")
	})

	it("calls a predicate without a receiver", () => {
		const T = type("number").narrow(function (this: unknown) {
			return this === undefined
		})
		attest(T(1)).equals(1)
		attest(T.allows(1)).equals(true)
	})

	it("implicit problem anonymous", () => {
		const Even = type("number", ":", n => n % 2 === 0)
		attest(Even(1).toString()).snap(
			"must be valid according to an anonymous predicate (was 1)"
		)
	})

	it("explicit problem", () => {
		const DivisibleBy3 = type([
			"number",
			":",
			(n, ctx) => n % 3 === 0 || ctx.reject("divisible by 3")
		])
		attest(DivisibleBy3(1).toString()).snap("must be divisible by 3 (was 1)")
	})

	it("chained narrows", () => {
		const A = type("number").narrow(
			(n, ctx) => n % 2 === 0 || ctx.reject("divisible by 2")
		)

		const b = A.narrow((n, ctx) => n % 3 === 0 || ctx.reject("divisible by 3"))

		const DivisibleBy30 = b.narrow(
			(n, ctx) => n % 5 === 0 || ctx.reject("divisible by 5")
		)

		attest<number>(DivisibleBy30.t)

		attest(DivisibleBy30(1).toString()).snap("must be divisible by 2 (was 1)")
		attest(DivisibleBy30(2).toString()).snap("must be divisible by 3 (was 2)")
		attest(DivisibleBy30(6).toString()).snap("must be divisible by 5 (was 6)")
		attest(DivisibleBy30(30)).equals(30)
	})

	// a precompiled build describes a narrow at runtime, so it can't merge two
	it("describes each anonymous narrow", () => {
		const T = type("number")
			.narrow(n => n > 0)
			.narrow(n => n < 10)
		attest(T.description).snap(
			"a number and valid according to an anonymous predicate and valid according to an anonymous predicate"
		)
	})

	it("problem at path", () => {
		const AbEqual = type([
			{
				a: "number",
				b: "number"
			},
			":",
			({ a, b }, ctx) => {
				if (a === b) return true

				ctx.error({ expected: "equal to b", path: ["a"] })
				ctx.error({ expected: "equal to a", path: ["b"] })
				return false
			}
		])

		attest<{ a: number; b: number }>(AbEqual.t)
		attest<{
			a: number
			b: number
		}>(AbEqual.infer)
		attest(AbEqual({ a: 1, b: 1 })).equals({ a: 1, b: 1 })
		attest(AbEqual({ a: 1, b: 2 }).toString())
			.snap(`a must be equal to b (was an object)
b must be equal to a (was an object)`)
	})

	it("functional predicate", () => {
		const One = type(["number", ":", (n): n is 1 => n === 1])
		attest<1>(One.infer)
	})

	it("functional parameter inference", () => {
		type Expected = number | boolean[]
		const validateNumberOrBooleanList = <t>(
			t: equals<t, Expected> extends true ? t : Expected
		) => true
		attest<number | boolean[]>(
			type(["number|boolean[]", ":", data => validateNumberOrBooleanList(data)])
				.infer
		)
		attest(() => {
			// @ts-expect-error
			type(["number|boolean[]", ":", (data: number | string[]) => !!data])
		}).type.errors("Type 'boolean' is not assignable to type 'string'.")
	})

	it("narrow problem", () => {
		const Palindrome = type([
			"string",
			":",
			(s, ctx) =>
				s === [...s].reverse().join("") ? true : ctx.reject("a palindrome")
		])
		attest<string>(Palindrome.t)
		attest(Palindrome("dad")).snap("dad")
		attest(Palindrome("david").toString()).snap(
			'must be a palindrome (was "david")'
		)
	})

	it("narrows the output type of a morph", () => {
		const _narrowMorphOutputMorph = (s: string) => s.length
		const _narrowMorphOutputNarrow = (n: number): n is 5 => n === 5
		const T = type("string")
			.pipe(_narrowMorphOutputMorph)
			.narrow(_narrowMorphOutputNarrow)

		attest(T.json).snap({
			morphs: [
				"string",
				registeredReference(_narrowMorphOutputMorph),
				{ predicate: [registeredReference(_narrowMorphOutputNarrow)] }
			]
		})

		attest<(In: string) => Out<5>>(T.t)

		attest(T("12345")).snap(5)
		attest(T("1234").toString()).snap(
			"must be valid according to _narrowMorphOutputNarrow (was 4)"
		)
	})

	it("expression", () => {
		const T = type("string", ":", (s): s is `f${string}` => s[0] === "f")
		attest<`f${string}`>(T.infer)
		attest(T.expression).snap("string & fn")
	})

	it("is written by its name after what it narrows", () => {
		const isLong = (s: string) => s.length > 2
		attest(type("string").narrow(isLong).expression).snap("string & isLong")
		attest(type("string").narrow(isLong).array().expression).snap(
			"(string & isLong)[]"
		)
		attest(type("number > 5").narrow(n => n % 2 === 0).expression).snap(
			"number > 5 & fn"
		)
		attest(type("unknown").narrow(isLong as never).expression).snap("isLong")
		attest(type({ a: "string" }).narrow(isLong as never).expression).snap(
			"{ a: string } & isLong"
		)
		attest(type({ a: "string" }).narrow(isLong as never).description).snap(
			"{ a: a string }"
		)
	})

	it("is written by its keyword", () => {
		attest(type("string.date").expression).snap("string.date")
		attest(type("string.date[]").expression).snap("string.date[]")
		attest(type("string.date & string.url > 5").expression).snap(
			"string.date & string.url >= 6"
		)
		attest(type("string.creditCard").expression).snap("string.creditCard")
		attest(type("string.creditCard | number").expression).snap(
			"number | string.creditCard"
		)
		attest(type("string.creditCard").description).snap("a credit card number")
		attest(
			type.raw(type("string.date").expression).equals("string.date")
		).equals(true)
	})

	it("can't narrow a morph in a tuple expression", () => {
		const toLength = (s: string) => s.length
		const isEven = (n: number) => n % 2 === 0
		// @ts-expect-error
		attest(() => type([["string", "=>", toLength], ":", isEven]))
			.throws("Predicate operand must be unknown (was a morph)")
			.type.errors("Predicate operand must be unknown (was a morph)")
		// @ts-expect-error
		attest(() => type(["string", "=>", toLength], ":", isEven))
			.throws("Predicate operand must be unknown (was a morph)")
			.type.errors("Predicate operand must be unknown (was a morph)")
		attest(() =>
			scope({ b: [["b", "=>", toLength], ":", isEven] } as never).export()
		).throws.snap("ParseError: Predicate operand must be unknown (was a morph)")
	})

	it("narrows the output type of an morph within a single type", () => {
		const T = type("string")
			.pipe(s => `${s}!`)
			.narrow((s): s is "foo!" => s === "foo!")

		attest(T.t).type.toString.snap('(In: string) => Out<"foo!">')
		attest<string>(T.inferIn)
		attest<"foo!">(T.infer)
	})

	it("narrow then pipe", () => {
		const toString = (bigint: bigint) => bigint.toString()
		const predicate = () => true

		const predicateId = registeredReference(predicate)
		const morphId = registeredReference(toString)

		const A = type("bigint").narrow(predicate).pipe(toString)

		attest<(In: bigint) => Out<string>>(A.t)
		attest<bigint>(A.in.infer)
		attest<bigint>(A.inferIn)
		attest<string>(A.infer)

		attest(A.json).snap({
			morphs: [{ domain: "bigint", predicate: [predicateId] }, morphId]
		})
	})

	it("can distill constrained built-ins", () => {
		const N = type("number")
			.narrow(() => true)
			.pipe(() => true)
		attest<number>(N.inferIn)
		attest<number>(N.in.infer)

		const S = type("string")
			.narrow(() => true)
			.pipe(() => true)
		attest<string>(S.inferIn)
		attest<string>(S.in.infer)

		const B = type("bigint")
			.narrow(() => true)
			.pipe(() => true)
		attest<bigint>(B.inferIn)
		attest<bigint>(B.in.infer)

		const Sym = type("symbol")
			.narrow(() => true)
			.pipe(() => true)
		attest<symbol>(Sym.inferIn)
		attest<symbol>(Sym.in.infer)

		const D = type("Date")
			.narrow(() => true)
			.pipe(() => true)
		attest<Date>(D.inferIn)
	})

	it("can distill constrained objects", () => {
		const Obj = type({ foo: "number" })
			.narrow(() => true)
			.pipe(() => true)
		attest<{ foo: number }>(Obj.inferIn)
		attest<{ foo: number }>(Obj.in.infer)

		const Nested = type({ foo: ["number.integer", "=>", n => n++] })
		attest(Nested.t).type.toString.snap("{ foo: (In: number) => Out<number> }")
		attest<{ foo: number }>(Nested.inferIn)
		attest<{ foo: number }>(Nested.in.infer)

		const Map = type.keywords.Map.narrow(() => true).pipe(m => m)
		attest(Map.t).type.toString.snap(`(
	In: Map<unknown, unknown>
) => Out<Map<unknown, unknown>>`)
		attest(Map.infer).type.toString.snap("Map<unknown, unknown>")
		attest(Map.inferIn).type.toString("Map<unknown, unknown>")
	})

	it("can distill constrained arrays", () => {
		const Arr = type("string[]")
			.narrow(() => true)
			.pipe(() => true)
		attest<string[]>(Arr.inferIn)
		attest<string[]>(Arr.in.infer)

		const ObjArr = type({ foo: "string.date.parse" })
			.array()
			.narrow(() => true)
			.pipe(d => d)
		attest<
			{
				foo: string
			}[]
		>(ObjArr.inferIn)
		attest<
			{
				foo: string
			}[]
		>(ObjArr.in.infer)
	})

	it("can distill units", () => {
		const T = type("5").narrow(() => true)
		attest<5>(T.t)
		attest<5>(T.infer)
		attest<5>(T.inferIn)

		// this predicate is evaluated and pruned
		attest(T.expression).equals("5")
	})

	// https://github.com/arktypeio/arktype/issues/1667
	it("reject without expected in non-discriminated union", () => {
		const T = type("string[] | Function").narrow(
			(v, ctx) => Array.isArray(v) || ctx.reject({ problem: "custom" })
		)
		attest(T(function foo() {}).toString()).snap(
			"must be valid according to an anonymous predicate or an array (was a function)"
		)
	})

	it("reject keeps the text it was given", () => {
		const input = { code: "predicate" as const, expected: "odd" }
		const Odd = type("number").narrow(
			(n, ctx) => n % 2 === 1 || ctx.reject(input)
		)
		const out = Odd(2)
		input.expected = "even"
		attest(out.toString()).snap("must be odd (was 2)")
	})

	it("unknown is narrowable", () => {
		const unknownPredicate854 = () => true
		const T = type("unknown").narrow(unknownPredicate854)
		attest(T.t).type.toString.snap("unknown")
		attest(T.json).snap({
			predicate: [registeredReference(unknownPredicate854)]
		})
	})

	it("preserves piped union branch narrows through an intersection", () => {
		const T = type({
			kind: "'a'",
			value: type("string.numeric.parse").narrow(
				(n, ctx) => n > 0 || ctx.mustBe("positive")
			)
		})
			.or({ kind: "'b'" })
			.and(type("object").pipe(o => o))

		attest(T({ kind: "a", value: "1" })).snap({ kind: "a", value: 1 })
		attest(T({ kind: "a", value: "-1" }).toString()).snap(
			"value must be positive (was -1)"
		)
	})

	it("prints nested bigints in errors", () => {
		const T = type("bigint[]").narrow(
			(arr, ctx) => new Set(arr).size === arr.length || ctx.mustBe("unique")
		)
		attest(T([1n, 0n, 1n]).toString()).snap("must be unique (was an array)")
	})

	it("calls a predicate once per value", () => {
		let callCount = 0
		const Positive = type("number").narrow(n => {
			callCount++
			return n > 0
		})
		const T = type({
			values: Positive.array(),
			other: type("number").narrow((n, ctx) => n > 0 || ctx.mustBe("positive"))
		})
		attest(T({ values: [1, -1, 2], other: 5 }).toString()).snap(
			"values[1] must be valid according to an anonymous predicate (was -1)"
		)
		// Allows stops at -1, then Apply checks each value once
		attest(callCount).equals(5)
	})

	it("checks data before applying a predicate reading ctx", () => {
		const calls: string[] = []
		const $ = scope({})
		const T = $.type({
			a: "string",
			b: $.type("string").narrow((s, ctx) => {
				calls.push(ctx.path.join("."))
				return s.length < 3 || ctx.mustBe("short")
			})
		})
		const data = { a: "a", b: "b" }
		attest(T(data) === data).equals(true)
		attest(calls.splice(0)).equals(["b"])
		attest(T({ a: "a", b: "long" }).toString()).snap(
			'b must be short (was "long")'
		)
		attest(calls).equals(["b", "b"])
	})

	it("union after failed branch predicate", () => {
		const notBad = (o: object, ctx: Traversal) =>
			!("bad" in o) || ctx.mustBe("not bad")
		const data = { x: { bad: 1 }, y: "s" }
		const T = type({ x: type("object").narrow(notBad) }).or({ y: "string" })

		attest(T.allows(data)).equals(true)
		attest(T(data)).equals(data)
		const types = scope({
			c: [{ "p?": "c" }, ":", notBad],
			u: [{ x: "c" }, "|", { y: "string" }]
		}).export()
		attest(types.u.allows(data)).equals(true)
	})

	it("failed branch predicate leaves its key off ctx.path", () => {
		const $ = scope({})
		const Positive = $.type("number").narrow(
			(n, ctx) => n > 0 || ctx.mustBe("positive")
		)
		const T = $.type({ a: Positive, z: "string > 3" }).or({
			b: $.type("string").pipe((s, ctx) =>
				s === "bad" ? ctx.error("good") : s
			),
			z: "string < 2"
		})
		attest(T({ a: -1, b: "bad", z: "q" }).toString()).snap(
			'b must be good (was "bad")'
		)
	})

	it("names a narrow that rejects every literal", () => {
		const _isNarrowedC = (s: string) => s === "c"
		attest(() => type("'a' | 'b'").narrow(_isNarrowedC)).throws(
			writeUnsatisfiableExpressionError(
				'Intersection of "a" | "b" and _isNarrowedC'
			)
		)
		attest(() =>
			type("'a' | 'b'").and(type("string").narrow(_isNarrowedC))
		).throws(
			writeUnsatisfiableExpressionError(
				'Intersection of "a" | "b" and string & _isNarrowedC'
			)
		)
		attest(() => type("'b'").narrow(_isNarrowedC)).throws(
			writeUnsatisfiableExpressionError('Intersection of "b" and _isNarrowedC')
		)
	})
})

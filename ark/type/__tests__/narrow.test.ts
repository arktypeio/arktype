import { attest, contextualize } from "@ark/attest"
import { registeredReference } from "@ark/schema"
import type { equals } from "@ark/util"
import { type } from "arktype"
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
		attest(AbEqual({ a: 1, b: 2 }).toString()).snap(
			'a must be equal to b (was {"a":1,"b":2})\nb must be equal to a (was {"a":1,"b":2})'
		)
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
		const T = type("string")
			.pipe(function _narrowMorphOutputMorph(s) {
				return s.length
			})
			.narrow(function _narrowMorphOutputNarrow(n): n is 5 {
				return n === 5
			})

		attest(T.json).snap({
			in: "string",
			morphs: [
				"$ark._narrowMorphOutputMorph",
				{ predicate: ["$ark._narrowMorphOutputNarrow"] }
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
			in: { domain: "bigint", predicate: [predicateId] },
			morphs: [morphId]
		})
	})

	it("can distill constrained builtins", () => {
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

	it("unknown is narrowable", () => {
		const unknownPredicate854 = () => true
		const T = type("unknown").narrow(unknownPredicate854)
		attest(T.t).type.toString.snap("unknown")
		attest(T.json).snap({ predicate: ["$ark.unknownPredicate854"] })
	})
})

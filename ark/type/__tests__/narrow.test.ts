import { attest, contextualize } from "@ark/attest"
import { registeredReference } from "@ark/schema"
import type { equals } from "@ark/util"
import { type } from "arktype"
import type { Out } from "arktype/internal/attributes.ts"

contextualize(() => {
	it("implicit problem", () => {
		const isOdd = (n: number) => n % 2 === 1
		const isOddRef = registeredReference(isOdd)
		const odd = type(["number", ":", isOdd])
		attest<number>(odd.infer)
		attest(odd.json).equals({ domain: "number", predicate: [isOddRef] })
		attest(odd(1)).equals(1)
		attest(odd(2).toString()).snap("must be valid according to isOdd (was 2)")
	})

	it("implicit problem anonymous", () => {
		const even = type("number", ":", n => n % 2 === 0)
		attest(even(1).toString()).snap(
			"must be valid according to an anonymous predicate (was 1)"
		)
	})

	it("explicit problem", () => {
		const divisibleBy3 = type([
			"number",
			":",
			(n, ctx) => n % 3 === 0 || ctx.reject("divisible by 3")
		])
		attest(divisibleBy3(1).toString()).snap("must be divisible by 3 (was 1)")
	})

	it("chained narrows", () => {
		const a = type("number").narrow(
			(n, ctx) => n % 2 === 0 || ctx.reject("divisible by 2")
		)

		const b = a.narrow((n, ctx) => n % 3 === 0 || ctx.reject("divisible by 3"))

		const divisibleBy30 = b.narrow(
			(n, ctx) => n % 5 === 0 || ctx.reject("divisible by 5")
		)

		attest<number>(divisibleBy30.t)

		attest(divisibleBy30(1).toString()).snap("must be divisible by 2 (was 1)")
		attest(divisibleBy30(2).toString()).snap("must be divisible by 3 (was 2)")
		attest(divisibleBy30(6).toString()).snap("must be divisible by 5 (was 6)")
		attest(divisibleBy30(30)).equals(30)
	})

	it("problem at path", () => {
		const abEqual = type([
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

		attest<{ a: number; b: number }>(abEqual.t)
		attest<{
			a: number
			b: number
		}>(abEqual.infer)
		attest(abEqual({ a: 1, b: 1 })).equals({ a: 1, b: 1 })
		attest(abEqual({ a: 1, b: 2 }).toString()).snap(
			'a must be equal to b (was {"a":1,"b":2})\nb must be equal to a (was {"a":1,"b":2})'
		)
	})

	it("functional predicate", () => {
		const one = type(["number", ":", (n): n is 1 => n === 1])
		attest<1>(one.infer)
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
		const palindrome = type([
			"string",
			":",
			(s, ctx) =>
				s === [...s].reverse().join("") ? true : ctx.reject("a palindrome")
		])
		attest<string>(palindrome.t)
		attest(palindrome("dad")).snap("dad")
		attest(palindrome("david").toString()).snap(
			'must be a palindrome (was "david")'
		)
	})

	it("narrows the output type of a morph", () => {
		const t = type("string")
			.pipe(s => s.length)
			.narrow((n): n is 5 => n === 5)

		const morphRef = t.internal.assertHasKind("morph").serializedMorphs[0]

		const predicateRef =
			t.internal.firstReferenceOfKindOrThrow("predicate").serializedPredicate

		attest(t.json).snap({
			in: "string",
			morphs: [morphRef, { predicate: [predicateRef] }]
		})

		attest<(In: string) => Out<5>>(t.t)

		attest(t("12345")).snap(5)
		attest(t("1234").toString()).snap(
			"must be valid according to an anonymous predicate (was 4)"
		)
	})

	it("expression", () => {
		const t = type("string", ":", (s): s is `f${string}` => s[0] === "f")
		attest<`f${string}`>(t.infer)
	})

	it("narrows the output type of an morph within a single type", () => {
		const t = type("string")
			.pipe(s => `${s}!`)
			.narrow((s): s is "foo!" => s === "foo!")

		attest(t.t).type.toString.snap('(In: string) => Out<"foo!">')
		attest<string>(t.inferIn)
		attest<"foo!">(t.infer)
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
		const number = type("number")
			.narrow(() => true)
			.pipe(() => true)
		attest<number>(number.inferIn)
		attest<number>(number.in.infer)

		const string = type("string")
			.narrow(() => true)
			.pipe(() => true)
		attest<string>(string.inferIn)
		attest<string>(string.in.infer)

		const bigint = type("bigint")
			.narrow(() => true)
			.pipe(() => true)
		attest<bigint>(bigint.inferIn)
		attest<bigint>(bigint.in.infer)

		const symbol = type("symbol")
			.narrow(() => true)
			.pipe(() => true)
		attest<symbol>(symbol.inferIn)
		attest<symbol>(symbol.in.infer)

		const date = type("Date")
			.narrow(() => true)
			.pipe(() => true)
		attest<Date>(date.inferIn)
	})

	it("can distill constrained objects", () => {
		const object = type({ foo: "number" })
			.narrow(() => true)
			.pipe(() => true)
		attest<{ foo: number }>(object.inferIn)
		attest<{ foo: number }>(object.in.infer)

		const nested = type({ foo: ["number.integer", "=>", n => n++] })
		attest(nested.t).type.toString.snap("{ foo: (In: number) => Out<number> }")
		attest<{ foo: number }>(nested.inferIn)
		attest<{ foo: number }>(nested.in.infer)

		const map = type.keywords.Map.narrow(() => true).pipe(m => m)
		attest(map.t).type.toString.snap(`(
	In: Map<unknown, unknown>
) => Out<Map<unknown, unknown>>`)
		attest(map.infer).type.toString.snap("Map<unknown, unknown>")
		attest(map.inferIn).type.toString("Map<unknown, unknown>")
	})

	it("can distill constrained arrays", () => {
		const array = type("string[]")
			.narrow(() => true)
			.pipe(() => true)
		attest<string[]>(array.inferIn)
		attest<string[]>(array.in.infer)

		const objArray = type({ foo: "string.date.parse" })
			.array()
			.narrow(() => true)
			.pipe(d => d)
		attest<
			{
				foo: string
			}[]
		>(objArray.inferIn)
		attest<
			{
				foo: string
			}[]
		>(objArray.in.infer)
	})

	it("can distill units", () => {
		const t = type("5").narrow(() => true)
		attest<5>(t.t)
		attest<5>(t.infer)
		attest<5>(t.inferIn)

		// this predicate is evaluated and pruned
		attest(t.expression).equals("5")
	})

	it("unknown is narrowable", () => {
		const unknownPredicate854 = () => true
		const t = type("unknown").narrow(unknownPredicate854)
		attest(t.t).type.toString.snap("unknown")
		attest(t.json).snap({ predicate: ["$ark.unknownPredicate854"] })
	})
})

import { attest, contextualize } from "@arktype/attest"
import type { Narrowed, Out, number, of, string } from "@arktype/schema"
import { registeredReference, type equals } from "@arktype/util"
import { type, type Type } from "arktype"

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
		const divisibleBy30 = type("number")
			.narrow((n, ctx) => n % 2 === 0 || ctx.reject("divisible by 2"))
			.narrow((n, ctx) => n % 3 === 0 || ctx.reject("divisible by 3"))
			.narrow((n, ctx) => n % 5 === 0 || ctx.reject("divisible by 5"))

		attest<number.narrowed>(divisibleBy30.t)

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
		attest<Type<string.narrowed>>(palindrome)
		attest(palindrome("dad")).snap("dad")
		attest(palindrome("david").toString()).snap(
			'must be a palindrome (was "david")'
		)
	})

	it("satisfying narrows input type of morphs", () => {
		const t = type("string")
			.pipe(s => s.length)
			.satisfying(s => s.length > 5)

		const morphRef = t.raw.assertHasKind("morph").serializedMorphs[0]

		const predicateRef =
			t.raw.firstReferenceOfKindOrThrow("predicate").serializedPredicate

		attest(t.json).snap({
			in: { domain: "string", predicate: [predicateRef] },
			morphs: [morphRef]
		})

		attest<Type<(In: string.narrowed) => Out<number>>>(t)

		attest(t("123456")).snap(6)
		attest(t("1234").toString()).snap(
			'must be valid according to an anonymous predicate (was "1234")'
		)
	})

	it("narrows the output type of a morph", () => {
		const t = type("string")
			.pipe(s => s.length)
			.narrow((n): n is 5 => n === 5)

		const morphRef = t.raw.assertHasKind("morph").serializedMorphs[0]

		const predicateRef =
			t.raw.firstReferenceOfKindOrThrow("predicate").serializedPredicate

		attest(t.json).snap({
			in: "string",
			morphs: [morphRef, { predicate: [predicateRef] }]
		})

		attest<Type<(In: string) => Out<of<5, Narrowed>>>>(t)

		attest(t("12345")).snap(5)
		attest(t("1234").toString()).snap(
			"must be valid according to an anonymous predicate (was 4)"
		)
	})

	it("expression", () => {
		const t = type("string", ":", (s): s is `f${string}` => s[0] === "f")
		attest<`f${string}`>(t.infer)
	})

	// TODO: reenable
	// https://github.com/arktypeio/arktype/issues/970
	// it("narrows the output type of an morph within a single type", () => {
	// 	const t = type("string")
	// 		.pipe(s => `${s}!`)
	// 		.narrow((s): s is "foo!" => s === "foo!")

	// 	attest<Type<(In: string) => Out<of<"foo!", Narrowed>>>>(t)
	// })
})

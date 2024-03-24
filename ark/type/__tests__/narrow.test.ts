import { attest } from "@arktype/attest"
import { reference, type equals } from "@arktype/util"
import { type, type Type } from "arktype"
import { describe } from "mocha"
import type { of, predicate, predicate } from "../constraints/ast.js"
import type { Out } from "../types/morph.js"

describe("narrow", () => {
	it("implicit problem", () => {
		const isOdd = (n: number) => n % 2 === 1
		const isOddRef = reference(isOdd)
		const odd = type(["number", ":", isOdd])
		attest<number>(odd.infer)
		attest(odd.json).equals({ domain: "number", predicate: [isOddRef] })
		attest(odd(1).out).equals(1)
		attest(odd(2).errors?.summary).snap(
			"must be valid according to isOdd (was 2)"
		)
	})
	it("implicit problem anonymous", () => {
		const even = type("number", ":", (n) => n % 2 === 0)
		attest(even(1).errors?.summary).snap(
			"must be valid according to an anonymous predicate (was 1)"
		)
	})
	it("explicit problem", () => {
		const even = type([
			"number",
			":",
			(n, ctx) => n % 3 === 0 || ctx.invalid({ expected: "divisible by 3" })
		])
		attest(even(1).errors?.summary).snap("must be divisible by 3 (was 1)")
	})
	it("problem at path", () => {
		const abEqual = type([
			{
				a: "number",
				b: "number"
			},
			":",
			({ a, b }, ctx) => {
				if (a === b) {
					return true
				}
				ctx.error({ expected: "equal to b", path: ["a"] })
				ctx.error({ expected: "equal to a", path: ["b"] })
				return false
			}
		])
		attest(abEqual({ a: 1, b: 1 }).out).equals({ a: 1, b: 1 })
		attest(abEqual({ a: 1, b: 2 }).errors?.summary).snap(
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
			type([
				"number|boolean[]",
				":",
				(data) => validateNumberOrBooleanList(data)
			]).infer
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
				s === [...s].reverse().join("") ? true : ctx.invalid("a palindrome")
		])
		attest<Type<string>>(palindrome)
		attest(palindrome("dad").out).snap("dad")
		attest(palindrome("david").errors?.summary).snap(
			'must be a palindrome (was "david")'
		)
	})
	it("narrows the output type of a morph", () => {
		const t = type("string")
			.morph((s) => s.length)
			.narrow((n): n is 5 => n === 5)
		attest<Type<(In: string) => Out<of<5> & predicate>>>(t)
	})
	it("expression", () => {
		const t = type("string", ":", (s): s is `f${string}` => s[0] === "f")
		attest<`f${string}`>(t.infer)
	})
})

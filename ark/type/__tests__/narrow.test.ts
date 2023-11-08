import { attest } from "@arktype/attest"
import { type Out } from "@arktype/schema"
import type { equals } from "@arktype/util"
import type { Ark, Type } from "arktype"
import { type } from "arktype"

describe("narrow", () => {
	it("implicit problem", () => {
		const isOdd = (n: number) => n % 2 === 1
		const odd = type(["number", ":", isOdd])
		attest<number>(odd.infer)
		// attest(odd.node).equals({ number: { narrow: isOdd as any } })
		attest(odd(1).data).equals(1)
		attest(odd(2).problems?.summary).snap(
			"Must be valid according to isOdd (was 2)"
		)
	})
	it("implicit problem anonymous", () => {
		const even = type(["number", ":", (n) => n % 2 === 0])
		attest(even(1).problems?.summary).snap("Must be valid (was 1)")
	})
	it("explicit problem", () => {
		const even = type([
			"number",
			":",
			(n, problems) => n % 3 === 0 || !problems.mustBe("divisible by 3", n, [])
		])
		attest(even(1).problems?.summary).snap("Must be divisible by 3 (was 1)")
	})
	it("problem at path", () => {
		type([{ s: "string" }])
		const abEqual = type([
			{
				a: "number",
				b: "number"
			},
			":",
			({ a, b }, problems) => {
				if (a === b) {
					return true
				}
				problems.mustBe("equal to b", a, ["a"])
				problems.mustBe("equal to a", b, ["b"])
				return false
			}
		])
		attest(abEqual({ a: 1, b: 1 }).data).equals({ a: 1, b: 1 })
		attest(abEqual({ a: 1, b: 2 }).problems?.summary).snap(
			'a must be equal to b (was {"a":1,"b":2})\nb must be equal to a (was {"a":1,"b":2})'
		)
	})
	it("functional predicate", () => {
		const one = type(["number", ":", (n): n is 1 => n === 1])
		attest<Type<1>>(one)
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
			(s, problems) =>
				s === [...s].reverse().join("")
					? true
					: !problems.mustBe("a palindrome", s, [])
		])
		attest<Type<string>>(palindrome)
		attest(palindrome("dad").data).snap("dad")
		attest(palindrome("david").problems?.summary).snap(
			"Must be a palindrome (was 'david')"
		)
	})
	it("narrows the output type of a morph", () => {
		const t = type("string")
			.morph((s) => s.length)
			.narrow((n): n is 5 => n === 5)
		attest<Type<(In: string) => Out<5>>>(t)
		attest(t.condition).snap('typeof $arkRoot === "string" && false && false')
	})
})

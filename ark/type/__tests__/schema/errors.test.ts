import { attest } from "@arktype/attest"
import { scope } from "arktype"
import { configure, defaultConfig } from "../../config.js"
import { node } from "../../keywords/ark.js"

describe("errors", () => {
	it("shallow", () => {
		const n = node({
			domain: "number",
			divisor: 3
		})
		attest(n(6)).snap({ out: 6 })
		attest(n(7).errors?.summary).snap("Must be a multiple of 3 (was 7)")
	})
	it("at path", () => {
		const o = node({
			domain: "object",
			prop: {
				key: "foo",
				value: {
					domain: "number",
					divisor: 3
				}
			}
		})
		attest(o({ foo: 6 }).out).snap({ foo: 6 })
		attest(o({ foo: 7 }).errors?.summary).snap(
			"foo must be a multiple of 3 (was 7)"
		)
	})
	it("array", () => {
		const t = node({
			proto: Array,
			sequence: "number"
		})
		attest(t([5]).out).snap([5])
		attest(t([5, "five"]).errors?.summary).snap(
			"Value at [1] must be a number (was string)"
		)
	})
	it("custom description integrated with error", () => {
		const superSpecialBigint = node({
			domain: "bigint",
			description: "my special bigint"
		})
		attest(superSpecialBigint.description).snap("my special bigint")
		attest(superSpecialBigint(5).errors?.summary).snap(
			"Must be my special bigint (was number)"
		)
	})
	it("custom description on parent doesn't affect children", () => {
		const evenNumber = node({
			domain: "number",
			divisor: 2,
			description: "an even number"
		})
		attest(evenNumber.description).snap("an even number")
		// since the error is from the divisor constraint which didn't have a
		// description, it is unchanged
		attest(evenNumber(5).errors?.summary).snap(
			"Must be a multiple of 2 (was 5)"
		)
	})
	it("can configure errors by kind at a scope level", () => {
		const types = scope(
			{ superSpecialString: "string" },
			{
				domain: {
					expected: (inner) => `custom expected ${inner.domain}`,
					actual: (data) => `custom actual ${data}`,
					problem: (ctx) => `custom problem ${ctx.expected} ${ctx.actual}`,
					message: (ctx) => `custom message ${ctx.problem}`
				}
			}
		).export()
		const superSpecialString = types.superSpecialString
		attest(superSpecialString(5).errors?.summary).snap(
			"custom message custom problem custom expected string custom actual 5"
		)
	})
	it("can configure description by kind at scope level", () => {
		const types = scope(
			{ superSpecialNumber: "number" },
			{
				domain: {
					description: (inner) => `my special ${inner.domain}`
				}
			}
		).export()
		const superSpecialNumber = types.superSpecialNumber
		attest(superSpecialNumber.description).snap("my special number")
		attest(superSpecialNumber("five").errors?.summary).snap(
			"Must be my special number (was string)"
		)
	})
	it("can apply a global config", () => {
		configure({
			domain: {
				description: (inner) => `my special ${inner.domain}`
			}
		})
		const mySpecialSymbol = scope({}).node("symbol")
		attest(mySpecialSymbol("foo").errors?.summary).snap(
			"Must be my special symbol (was string)"
		)
		configure({
			domain: defaultConfig.domain
		})
		const myBoringSymbol = scope({}).node("symbol")
		attest(myBoringSymbol("foo").errors?.summary).snap(
			"Must be a symbol (was string)"
		)
	})
})

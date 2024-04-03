import { attest } from "@arktype/attest"
import { configure, defaultConfig, schema } from "@arktype/schema"
import { scope } from "arktype"

describe("errors", () => {
	it("shallow", () => {
		const n = schema({
			domain: "number",
			divisor: 3
		})
		attest(n.apply(6)).snap({ data: 6, out: 6 })
		attest(n.apply(7).errors?.summary).snap("must be a multiple of 3 (was 7)")
	})
	it("at path", () => {
		const o = schema({
			domain: "object",
			prop: {
				key: "foo",
				value: {
					domain: "number",
					divisor: 3
				}
			}
		})
		attest(o.apply({ foo: 6 }).out).snap({ foo: 6 })
		attest(o.apply({ foo: 7 }).errors?.summary).snap(
			"foo must be a multiple of 3 (was 7)"
		)
	})
	it("array", () => {
		const t = schema({
			proto: Array,
			sequence: "number"
		})
		attest(t.apply([5]).out).snap([5])
		attest(t.apply([5, "five"]).errors?.summary).snap(
			"value at [1] must be a number (was string)"
		)
	})
	it("custom description integrated with error", () => {
		const superSpecialBigint = schema({
			domain: "bigint",
			description: "my special bigint"
		})
		attest(superSpecialBigint.description).snap("my special bigint")
		attest(superSpecialBigint.apply(5).errors?.summary).snap(
			"must be my special bigint (was number)"
		)
	})
	it("custom description on parent doesn't affect children", () => {
		const evenNumber = schema({
			domain: "number",
			divisor: 2,
			description: "an even number"
		})
		attest(evenNumber.description).snap("an even number")
		// since the error is from the divisor constraint which didn't have a
		// description, it is unchanged
		attest(evenNumber.apply(5).errors?.summary).snap(
			"must be a multiple of 2 (was 5)"
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
			"must be my special number (was string)"
		)
	})
	it("can apply a global config", () => {
		configure({
			domain: {
				description: (inner) => `my special ${inner.domain}`
			}
		})
		const mySpecialSymbol = schema("symbol")
		attest(mySpecialSymbol.apply("foo").errors?.summary).snap(
			"must be my special symbol (was string)"
		)
		configure({
			domain: defaultConfig.domain
		})
		const myBoringSymbol = schema("symbol")
		attest(myBoringSymbol.apply("foo").errors?.summary).snap(
			"must be a symbol (was string)"
		)
	})
})

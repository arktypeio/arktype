import { attest } from "@arktype/attest"
import { schema } from "@arktype/schema"
import { configure, defaultConfig } from "../config.js"
import { scopeNode } from "../scope.js"

describe("errors", () => {
	it("shallow", () => {
		const n = schema({
			basis: "number",
			divisor: 3
		})
		attest(n.apply(6)).snap({ out: 6 })
		attest(n.apply(7).errors?.summary).snap("Must be a multiple of 3 (was 7)")
	})
	it("at path", () => {
		const o = schema({
			basis: "object",
			required: {
				key: "foo",
				value: {
					basis: "number",
					divisor: 3
				}
			}
		})
		attest(o.apply({ foo: 6 })).snap({ out: { foo: 6 } })
		attest(o.apply({ foo: 7 }).errors?.summary).snap(
			"foo must be a multiple of 3 (was 7)"
		)
	})
	it("custom description integrated with error", () => {
		const superSpecialBigint = schema({
			domain: "bigint",
			description: "my special bigint"
		})
		attest(superSpecialBigint.description).snap("my special bigint")
		attest(superSpecialBigint.apply(5).errors?.summary).snap(
			"Must be my special bigint (was number)"
		)
	})
	it("custom description on parent doesn't affect children", () => {
		const evenNumber = schema({
			basis: "number",
			divisor: 2,
			description: "an even number"
		})
		attest(evenNumber.description).snap("an even number")
		// since the error is from the divisor constraint which didn't have a
		// description, it is unchanged
		attest(evenNumber.apply(5).errors?.summary).snap(
			"Must be a multiple of 2 (was 5)"
		)
	})
	it("custom configured description", () => {
		const evenNumber = schema({
			basis: "number",
			divisor: 2
		}).describe("an even number")
		//?
	})
	it("can configure errors by kind at a scope level", () => {
		const $ = scopeNode(
			{ superSpecialString: "string" },
			{
				domain: {
					expected: (inner) => `custom expected ${inner.domain}`,
					actual: (data) => `custom actual ${data}`,
					problem: (ctx) => `custom problem ${ctx.expected} ${ctx.actual}`,
					message: (ctx) => `custom message ${ctx.problem}`
				}
			}
		)
		const superSpecialString = $.resolutions.superSpecialString
		attest(superSpecialString.apply(5).errors?.summary).snap(
			"custom message custom problem custom expected string custom actual 5"
		)
	})
	it("can configure description by kind at scope level", () => {
		const $ = scopeNode(
			{ superSpecialNumber: "number" },
			{
				domain: {
					description: (inner) => `my special ${inner.domain}`
				}
			}
		)
		const superSpecialNumber = $.resolutions.superSpecialNumber
		attest(superSpecialNumber.description).snap("my special number")
		attest(superSpecialNumber.apply("five").errors?.summary).snap(
			"Must be my special number (was string)"
		)
	})
	it("can apply a global config", () => {
		configure({
			domain: {
				description: (inner) => `my special ${inner.domain}`
			}
		})
		const mySpecialSymbol = scopeNode({}).schema("symbol")
		attest(mySpecialSymbol.apply("foo").errors?.summary).snap(
			"Must be my special symbol (was string)"
		)
		configure({
			domain: defaultConfig.domain
		})
		const myBoringSymbol = scopeNode({}).schema("symbol")
		attest(myBoringSymbol.apply("foo").errors?.summary).snap(
			"Must be a symbol (was string)"
		)
	})
})

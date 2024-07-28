import { attest, contextualize } from "@ark/attest"
import { configure, schema } from "@ark/schema"
import { $ark } from "@ark/util"
import { schemaScope } from "../scope.js"

contextualize(() => {
	it("shallow", () => {
		const n = schema({
			domain: "number",
			divisor: 3
		})
		attest(n.traverse(6)).snap(6)
		attest(n.traverse(7)?.toString()).snap("must be a multiple of 3 (was 7)")
	})

	it("at path", () => {
		const o = schema({
			domain: "object",
			required: {
				key: "foo",
				value: {
					domain: "number",
					divisor: 3
				}
			}
		})
		attest(o.traverse({ foo: 6 })).snap({ foo: 6 })
		attest(o.traverse({ foo: 7 })?.toString()).snap(
			"foo must be a multiple of 3 (was 7)"
		)
	})

	it("array", () => {
		const t = schema({
			proto: Array,
			sequence: "number"
		})
		attest(t.traverse([5])).snap([5])
		attest(t.traverse([5, "five"])?.toString()).snap(
			"value at [1] must be a number (was string)"
		)
	})

	it("custom description integrated with error", () => {
		const superSpecialBigint = schema({
			domain: "bigint",
			description: "my special bigint"
		})
		attest(superSpecialBigint.description).snap("my special bigint")
		attest(superSpecialBigint.traverse(5)?.toString()).snap(
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
		attest(evenNumber.traverse(5)?.toString()).snap(
			"must be a multiple of 2 (was 5)"
		)
	})

	it("can configure errors by kind at a scope level", () => {
		const types = schemaScope(
			{ superSpecialString: "string" },
			{
				domain: {
					expected: inner => `custom expected ${inner.domain}`,
					actual: data => `custom actual ${data}`,
					problem: ctx => `custom problem ${ctx.expected} ${ctx.actual}`,
					message: ctx => `custom message ${ctx.problem}`
				}
			}
		).export()
		const superSpecialString = types.superSpecialString
		attest(superSpecialString(5)?.toString()).snap(
			"custom message custom problem custom expected string custom actual 5"
		)
	})

	it("can configure description by kind at scope level", () => {
		const types = schemaScope(
			{ superSpecialNumber: "number" },
			{
				domain: {
					description: inner => `my special ${inner.domain}`
				}
			}
		).export()
		const superSpecialNumber = types.superSpecialNumber
		attest(superSpecialNumber.description).snap("my special number")
		attest(superSpecialNumber("five")?.toString()).snap(
			"must be my special number (was string)"
		)
	})

	it("can apply a global config", () => {
		configure({
			domain: {
				description: inner => `my special ${inner.domain}`
			}
		})
		const mySpecialSymbol = schemaScope({}).schema("symbol")
		attest(mySpecialSymbol.traverse("foo")?.toString()).snap(
			"must be my special symbol (was string)"
		)
		configure({
			domain: $ark.defaultConfig.domain
		})
		const myBoringSymbol = schemaScope({}).schema("symbol")
		attest(myBoringSymbol.traverse("foo")?.toString()).snap(
			"must be a symbol (was string)"
		)
	})
})

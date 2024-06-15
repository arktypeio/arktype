import { attest, contextualize } from "@arktype/attest"
import { type } from "arktype"
import { AssertionError } from "node:assert"

contextualize(() => {
	it("root discriminates", () => {
		const t = type("string")
		const out = t("")
		if (out instanceof type.errors) out.throw()
		else attest<string>(out)
	})

	it("allows", () => {
		const t = type("number%2")
		const data: unknown = 4
		if (t.allows(data)) {
			// narrows correctly
			attest<number>(data)
		} else throw new Error()

		attest(t.allows(5)).equals(false)
	})

	it("errors can be thrown", () => {
		const t = type("number")
		try {
			const result = t("invalid")
			attest(result instanceof type.errors && result.throw())
		} catch (e) {
			attest(e instanceof AggregateError).equals(true)
			attest((e as AggregateError).errors instanceof type.errors)
			return
		}
		throw new AssertionError({ message: "Expected to throw" })
	})

	it("assert", () => {
		const t = type({ a: "string" })
		attest(t.assert({ a: "1" })).equals({ a: "1" })
		attest(() => t.assert({ a: 1 })).throws.snap(
			"AggregateError: a must be a string (was number)"
		)
	})

	it("references by path", () => {
		const user = type({
			"[string]": "string | number",
			name: "string",
			"age?": "integer < 100"
		}).and(["true", "false"])

		attest(user.internal.expressionsByPath).snap({
			"": [
				"{ [string]: number | string, name: string, age?: number % 1 & <100 } & [true, false]",
				"Array",
				"{ length: 2 }",
				"{ [string]: number | string, name: string, age?: number % 1 & <100 } & [true, false]"
			],
			name: ["name: string", "string"],
			age: [
				"age?: number % 1 & <100",
				"number % 1 & <100",
				"number",
				"% 1",
				"<100"
			],
			"[string]": [
				"[string]: number | string",
				"string",
				"number | string",
				"number"
			],
			'["0"]': ["true"],
			'["1"]': ["false"]
		})
	})
})

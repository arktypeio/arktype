import { attest, contextualize } from "@ark/attest"
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
			result instanceof type.errors && result.throw()
		} catch (e) {
			attest(e).instanceOf(AggregateError)
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

	describe("as", () => {
		it("valid cast", () => {
			const from = type("/^foo.*$/")
			const t = from.as<`foo${string}`>()

			attest<`foo${string}`>(t.t)
			attest(t === from).equals(true)
		})

		it("cast to any", () => {
			const t = type("unknown").as<any>()
			attest<any>(t.t)
		})

		it("cast to never", () => {
			const t = type("unknown").as<never>()
			attest<never>(t.t)
		})

		it("missing type param", () => {
			// @ts-expect-error
			attest(() => type("string").as()).type.errors.snap(
				"Expected 1 arguments, but got 0."
			)
		})

		it("missing type param with arg", () => {
			// @ts-expect-error
			attest(() => type("string").as("foo")).type.errors(
				"as requires an explicit type parameter like myType.as<t>() "
			)
		})
	})
})

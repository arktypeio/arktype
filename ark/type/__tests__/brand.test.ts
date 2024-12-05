import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import type { number, string } from "arktype/internal/attributes.ts"

contextualize(() => {
	it("chained", () => {
		const t = type("string").brand("foo")
		attest(t.t).type.toString.snap('branded<"foo">')

		// no effect at runtime
		attest(t.expression).equals("string")

		const out = t("moo")
		attest<string.branded<"foo"> | type.errors>(out)
	})

	it("from morph", () => {
		const fluent = type("string.numeric.parse").brand("num")

		attest(fluent.t)

		throw Error()

		const string = type("string.numeric.parse#num")

		attest(string.t)
	})

	it("replaces existing attributes", () => {
		const fluent = type("string.numeric.parse").brand("num")

		attest(fluent.t)

		throw Error()

		const string = type("string.numeric.parse#num")

		attest(string.t)
	})

	it("string-embedded", () => {
		const t = type("number#cool")
		attest(t.t).type.toString.snap('branded<"cool">')

		attest(t.expression).equals("number")

		const out = t(5)
		attest<number.branded<"cool"> | type.errors>(out)
	})

	it("brandAttributes", () => {
		const unbranded = type({
			age: "number.integer >= 0"
		})

		attest(unbranded.t).type.toString.snap(
			"{ age: is<DivisibleBy<1> & AtLeast<0>> }"
		)

		const out = unbranded({ age: 5 })

		attest<
			| type.errors
			| {
					age: number
			  }
		>(out).equals({ age: 5 })

		const branded = unbranded.brandAttributes()

		attest(branded.t).type.toString.snap(
			"{ age: brand<number, DivisibleBy<1> & AtLeast<0>> }"
		)

		const brandedOut = branded({ age: 5 })

		attest(brandedOut).type.toString.snap(`	| ArkErrors
	| { age: brand<number, DivisibleBy<1> & AtLeast<0>> }`)

		const reunbranded = branded.unbrandAttributes()

		attest(reunbranded.t).type.toString.snap(
			"{ age: is<DivisibleBy<1> & AtLeast<0>> }"
		)

		attest<typeof unbranded, typeof reunbranded>()
		attest(unbranded.json).equals(reunbranded.json)
	})
})

import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import type { number, string } from "arktype/internal/keywords/inference.ts"

contextualize(() => {
	it("chained", () => {
		const t = type("string").brand("foo")
		attest(t.t).type.toString.snap('branded<"foo">')

		// no effect at runtime
		attest(t.expression).equals("string")

		const out = t("moo")
		attest<string.branded<"foo"> | type.errors>(out)
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

		attest(unbranded.t).type.toString.snap()

		const out = unbranded({ age: 5 })

		attest<
			| type.errors
			| {
					age: number
			  }
		>(out).equals({ age: 5 })

		const branded = unbranded.brandAttributes()

		attest(branded.t).type.toString.snap()

		const brandedOut = branded({ age: 5 })

		attest(brandedOut).type.toString.snap()

		const reunbranded = branded.unbrandAttributes()

		attest(reunbranded.t).type.toString.snap()

		attest<typeof branded, typeof reunbranded>()
		attest(unbranded.json).equals(reunbranded.json)
	})
})

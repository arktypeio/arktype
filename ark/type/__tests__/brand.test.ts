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
})

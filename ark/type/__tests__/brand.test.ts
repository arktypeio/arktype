import { attest, contextualize } from "@ark/attest"
import type { Branded } from "@ark/util"
import { type } from "arktype"

contextualize(() => {
	it("chained", () => {
		const t = type("string").brand("foo")
		attest(t.t).type.toString.snap('branded<"foo">')

		// no effect at runtime
		attest(t.expression).equals("string")

		const out = t("moo")
		attest<Branded<string, "foo"> | type.errors>(out)
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
		attest<Branded<number, "cool"> | type.errors>(out)
	})
})

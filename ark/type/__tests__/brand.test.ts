import { attest, contextualize } from "@ark/attest"
import type { Brand } from "@ark/util"
import { type } from "arktype"

contextualize(() => {
	it("fluent", () => {
		const t = type("string").brand("foo")
		attest(t.t).type.toString.snap('(In: string) => To<Brand<string, "foo">>')

		// no effect at runtime
		attest(t.expression).equals("string")

		const out = t("moo")
		attest<Brand<string, "foo"> | type.errors>(out)
	})

	it("string", () => {
		const t = type("number#cool")
		attest(t.t).type.toString.snap('(In: number) => To<Brand<number, "cool">>')

		attest(t.expression).equals("number")

		const out = t(5)
		attest<Brand<number, "cool"> | type.errors>(out)
	})

	it("from morph", () => {
		const fluent = type("string.numeric.parse").brand("num")

		attest(fluent.t).type.toString.snap(
			'(In: string) => To<Brand<number, "num">>'
		)

		const string = type("string.numeric.parse#num")

		attest(string.json).equals(fluent.json)
		attest<typeof fluent.t>(string.t)
	})
})

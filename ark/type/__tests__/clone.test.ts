import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("preserves the original references if no morphs are present", () => {
		const t = type({
			foo: "string"
		})

		const original = { foo: "bar" }

		const out = t(original)
		attest(out).is(original)
	})

	it("clones by default before morphing", () => {
		const t = type({
			foo: "string.trim"
		})

		const original = { foo: "  bar  " }

		const out = t(original)

		attest(out).snap({ foo: "bar" })
		attest(original).snap({ foo: "  bar  " })
	})
})

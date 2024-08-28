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

	it("default clone implementation preserves prototypes", () => {
		const t = type(["Date", "=>", d => d.toISOString()])
		attest(t.from(new Date(2000, 1))).equals("2000-01-01T00:00:00.000Z")
	})

	it("can be configured to mutate", () => {
		const types = type.module(
			{
				trimAndMutate: { foo: "string.trim" }
			},
			{ clone: false }
		)

		const original = { foo: "  bar  " }

		const out = types.trimAndMutate(original)

		attest(out).snap({ foo: "bar" })
		attest(out).is(original)
	})

	it("can be configured to mutate", () => {
		const types = type.module(
			{
				trimAndMutate: { foo: "string.trim" }
			},
			{ clone: false }
		)

		const original = { foo: "  bar  " }

		const out = types.trimAndMutate(original)

		attest(out).snap({ foo: "bar" })
		attest(out).is(original)
	})

	it("can be configured to use a custom clone implementation", () => {
		const types = type.module(
			{
				trimAndMutate: { foo: "string.trim" }
			},
			{ clone: original => ({ ...original, customCloned: true }) }
		)

		const out = types.trimAndMutate({ foo: "  bar  " })

		attest(out).unknown.snap({ foo: "bar", customCloned: true })
	})
})

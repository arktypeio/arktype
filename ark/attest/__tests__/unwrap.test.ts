import { attest, contextualize } from "@ark/attest"
import type { Completions } from "@ark/attest/internal/cache/writeAssertionCache.ts"
import type { autocomplete } from "@ark/util"

contextualize(() => {
	it("unwraps unversioned", () => {
		const unwrapped = attest({ foo: "bar" }).unwrap()
		attest<{ foo: string }>(unwrapped).equals({
			foo: "bar"
		})
	})

	it("unwraps serialized", () => {
		const unwrapped = attest({ foo: Symbol("unwrappedSymbol") }).unwrap({
			serialize: true
		})
		attest(unwrapped).snap({ foo: "Symbol(unwrappedSymbol)" })
	})

	it("unwraps completions", () => {
		const unwrapped = attest({ foo: "b" } satisfies {
			foo: autocomplete<"bar">
		}).completions.unwrap()

		attest<Completions>(unwrapped).snap({ b: ["bar"] })
	})
})

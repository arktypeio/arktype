import { attest, contextualize } from "@ark/attest"
import { unionJsonSchemaWritersKey, type BaseRoot } from "@ark/schema"
import { type, type Type } from "arktype"
import { traceFallbacks } from "arktype/internal/standalone/fallbacks.ts"

// each level reuses the last twice, doubling the fallback's calls and the
// objects each call would record the state of
const traced = (levels: number) => {
	let t: Type<any> = type("string.trim")
	for (let i = 0; i < levels; i++) t = type({ a: t, b: t })
	const root = t.internal as BaseRoot
	return traceFallbacks(root, (fallback, writers) =>
		root.toJsonSchema({
			fallback,
			[unionJsonSchemaWritersKey]: writers
		} as never)
	)
}

contextualize(() => {
	it("traces a Type reusing another", () => {
		attest(traced(3)?.steps.length).equals(8)
	})

	it("refuses one whose states would fill the heap", () => {
		attest(traced(12)).equals(undefined)
	})
})

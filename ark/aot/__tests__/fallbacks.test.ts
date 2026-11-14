import { attest, contextualize } from "@ark/attest"
import { unionJsonSchemaWritersKey, type BaseRoot } from "@ark/schema"
import { type, type Type } from "arktype"
import {
	traceFallbacks,
	writeReplay
} from "arktype/internal/standalone/fallbacks.ts"

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

// what a fallback holding each ctx it's passed reads at each call, then the result
const readsOf = (run: (fallback: (ctx: object) => object) => unknown) => {
	const held: object[] = []
	const reads: string[] = []
	const written = run(ctx => {
		held.push(ctx)
		reads.push(JSON.stringify(held))
		return { call: held.length }
	})
	return [...reads, JSON.stringify(written)]
}

contextualize(() => {
	it("traces a Type reusing another", () => {
		attest(traced(3)?.steps.length).equals(8)
	})

	it("refuses one reusing another too deep to read at each call", () => {
		attest(traced(12)).equals(undefined)
	}).timeout(60_000)

	it("replays what a writer changes after a call could read it", () => {
		const writeSchema = (fallback: (ctx: object) => object) => {
			const changing: Record<string, unknown> = { type: "object" }
			const unchanged = { type: "string" }
			const first = fallback({ code: "predicate", base: changing, unchanged })
			changing.late = "set"
			const second = fallback({ code: "predicate", base: changing })
			delete changing.late
			changing.result = first
			const third = fallback({ code: "predicate", base: changing, unchanged })
			changing.type = "array"
			return { changing, unchanged, second, third }
		}
		const trace = traceFallbacks(
			type("string").internal as BaseRoot,
			writeSchema as never
		)!
		const replay = writeReplay(
			trace,
			value => JSON.stringify(value),
			() => undefined,
			text => text
		)!
		const replayed = new Function(`return ${replay}`)() as (
			fallBack: (code: string, ctx: object) => object
		) => unknown
		attest(readsOf(fallback => replayed((_, ctx) => fallback(ctx)))).equals(
			readsOf(writeSchema)
		)
	})
})

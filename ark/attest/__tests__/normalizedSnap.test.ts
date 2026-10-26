import { attest, contextualize } from "@ark/attest"
import * as assert from "node:assert/strict"

contextualize(() => {
	it("normalizes nested properties and unions without hiding type changes", () => {
		const first = {} as {
			z: { b: "b" | "a"; a: 1 } | { d: 4; c: 3 }
			readonly a?: [string, number]
		}
		const reordered = {} as {
			readonly a?: [string, number]
			z: { c: 3; d: 4 } | { a: 1; b: "a" | "b" }
		}
		const expected = `{
	readonly a?: [string, number]
	z: { a: 1; b: "a" | "b" } | { c: 3; d: 4 }
}`
		attest(first).type.toString.normalizedSnap(expected)
		attest(reordered).type.toString.normalizedSnap(expected)
		assert.throws(
			() =>
				attest(
					{} as { a: [number, string]; z: { a: 1; b: "a" | "b" } }
				).type.toString.normalizedSnap(expected),
			assert.AssertionError
		)
		attest({} as { b: 2; a: 1 }).type.toString.snap("{ b: 2; a: 1 }")
	})

	it("preserves literal text, tuple positions and overload order", () => {
		const value = {} as {
			z: "red|blue" | "green"
			b: (value: string, count: number) => "z" | "a"
			(value: "special"): 1
			readonly "a-key"?: [string, number]
			(value: string): 2
			[Symbol.toStringTag]: "value"
		}
		attest(value).type.toString.normalizedSnap(`{
	(value: "special"): 1
	(value: string): 2
	readonly "a-key"?: [string, number]
	b: (value: string, count: number) => "a" | "z"
	z: "green" | "red|blue"
	[Symbol.toStringTag]: "value"
}`)
		attest({} as (() => "z" | "a") | "literal").type.toString.normalizedSnap(
			'"literal" | (() => "a" | "z")'
		)
		attest({} as { z: 1 } & { a: 2 }).type.toString.normalizedSnap(
			"{ z: 1 } & { a: 2 }"
		)
		attest({} as { 2: 2; readonly "a|b": `z${string}` | `a${string}`; 10: 10 })
			.type.toString.normalizedSnap(`{
	10: 10
	2: 2
	readonly "a|b": \`a\${string}\` | \`z\${string}\`
}`)
	})
})

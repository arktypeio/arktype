import { attest } from "@arktype/attest"
import { suite, test } from "mocha"
import type { Fn } from "../functions.js"
import type { conform } from "../generics.js"
import type { overloadOf } from "../unionToTuple.js"

declare const f: {
	(): void
	(a?: 1): 1
	(a: 2, b: 2): 2
}

declare function pipe<f extends Fn, args extends readonly unknown[]>(
	args: conform<args, Parameters<overloadOf<f>>>,
	f: f
): ReturnType<overloadOf<f, args>>

suite("overloads", () => {
	test("parameters", () => {
		const t = {} as Parameters<overloadOf<typeof f>>
		attest(t).typed as [a: 2, b: 2] | [a?: 1 | undefined] | []
	})
	test("returns", () => {
		const t = {} as ReturnType<overloadOf<typeof f>>
		attest(t).typed as void | 1 | 2
	})
	test("overload return", () => {
		const limit = {} as ((s: string) => string) & ((n: number) => number)
		const fromNumber = {} as overloadOf<typeof limit, [5]>
		attest(fromNumber).typed as number
		const fromString = {} as overloadOf<typeof limit, ["foo"]>
		attest(fromString).typed as string
	})
	test("()=>never", () => {
		const t = {} as Parameters<
			overloadOf<{
				(): void
				(a?: 1): 1
				(a: 2, b: 2): 2
				(): never
			}>
		>
		attest(t).typed as [a: 2, b: 2] | [a?: 1 | undefined] | []
	})
	test("pipe", () => {
		const limit = {} as ((s: string) => string) & ((n: number) => number)
		const n = pipe([5], limit)
		attest(n).typed as number
		const s = pipe(["foo"], limit)
		attest(s).typed as string
		// @ts-expect-error
		const bad = pipe([], limit)
		// @ts-expect-error
		const bad2 = pipe(["foo", "bar"], limit)
		// @ts-expect-error
		const bad3 = pipe([true], limit)
	})
})

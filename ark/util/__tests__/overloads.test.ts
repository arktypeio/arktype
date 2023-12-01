import { attest } from "@arktype/attest"
import type { Fn } from "../functions.js"
import type { conform } from "../generics.js"
import type { overloadOf } from "../unionToTuple.js"

declare const f: {
	(): void
	(a?: 1): 1
	(a: 2, b: 2): 2
}

const pipe = <f extends Fn<any[]>, args extends readonly unknown[]>(
	args: conform<args, Parameters<overloadOf<f>>>,
	f: f
): ReturnType<overloadOf<f, args>> => f(...args) as never

describe("overloads", () => {
	it("parameters", () => {
		const t = {} as Parameters<overloadOf<typeof f>>
		attest<[a: 2, b: 2] | [a?: 1 | undefined] | []>(t)
	})
	it("returns", () => {
		const t = {} as ReturnType<overloadOf<typeof f>>
		attest<void | 1 | 2>(t)
	})
	it("overload return", () => {
		const limit = {} as ((s: string) => string) & ((n: number) => number)
		const fromNumber = {} as overloadOf<typeof limit, [5]>
		attest<number>(fromNumber)
		const fromString = {} as overloadOf<typeof limit, ["foo"]>
		attest<string>(fromString)
	})
	it("()=>never", () => {
		const t = {} as Parameters<
			overloadOf<{
				(): void
				(a?: 1): 1
				(a: 2, b: 2): 2
				(): never
			}>
		>
		attest<[a: 2, b: 2] | [a?: 1 | undefined] | []>(t)
	})
	it("pipe", () => {
		const limit = ((_) => _) as ((s: string) => string) &
			((n: number) => number)
		const n = pipe([5], limit)
		attest<number>(n)
		const s = pipe(["foo"], limit)
		attest<string>(s)
		// @ts-expect-error
		attest(() => pipe([], limit))
		// @ts-expect-error
		attest(() => pipe(["foo", "bar"], limit))
		// @ts-expect-error
		attest(() => pipe([true], limit))
	})
})

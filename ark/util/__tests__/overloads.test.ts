import { attest, contextualize } from "@ark/attest"
import type { array, conform, overloadOf } from "@ark/util"

type fn = {
	(): void
	(a?: 1): 1
	(a: 2, b: 2): 2
}

const pipe = <fn extends (...args: any[]) => unknown, args extends array>(
	args: conform<args, Parameters<overloadOf<fn>>>,
	f: fn
): ReturnType<overloadOf<fn, args>> => f(...args) as never

contextualize(() => {
	it("parameters", () => {
		const T = {} as Parameters<overloadOf<fn>>
		attest<[a: 2, b: 2] | [a?: 1 | undefined] | []>(T)
	})

	it("returns", () => {
		const T = {} as ReturnType<overloadOf<fn>>
		attest<void | 1 | 2>(T)
	})

	it("overload return", () => {
		type limit = ((s: string) => string) & ((n: number) => number)
		type fromNumber = ReturnType<overloadOf<limit, [number]>>
		attest<number, fromNumber>()
		// currently doesn't work for subtypes
		// type fromString = overloadOf<typeof limit, ["foo"]>
		// attest<string, fromString>()
	})

	it("()=>never", () => {
		type result = Parameters<
			overloadOf<{
				(): void
				(a?: 1): 1
				(a: 2, b: 2): 2
				(): never
			}>
		>
		attest<[a: 2, b: 2] | [a?: 1 | undefined] | [], result>()
	})

	it("pipe", () => {
		const limit = (_ => _) as ((s: string) => string) & ((n: number) => number)
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

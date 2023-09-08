import { attest } from "@arktype/attest"
import type { conform, Hkt } from "@arktype/util"
import { suite, test } from "mocha"

suite("hkt", () => {
	interface AppendKind extends Hkt {
		f: (
			args: conform<
				this[Hkt.key],
				readonly [element: unknown, to: readonly unknown[]]
			>
		) => [...(typeof args)[1], (typeof args)[0]]
	}
	test("base", () => {
		type result = Hkt.apply<AppendKind, [2, [0, 1]]>
		attest({} as result).typed as [0, 1, 2]
	})
	test("reify", () => {
		const append = ((element: unknown, to: readonly unknown[]) => [
			...to,
			element
		]) as Hkt.apply<Hkt.Reify, AppendKind>
		const result = append([2, [0, 1]])
		attest(result).typed as [0, 1, 2]
	})
})

import { attest } from "@arktype/attest"
import type { conform, Hkt } from "@arktype/util"
import { suite, test } from "mocha"

suite("hkt", () => {
	interface AppendKind extends Hkt.Kind {
		f: (
			args: conform<
				this[Hkt.key],
				readonly [element: unknown, to: readonly unknown[]]
			>
		) => [...(typeof args)[1], (typeof args)[0]]
	}
	test("base", () => {
		type result = Hkt.apply<AppendKind, [2, [0, 1]]>
		attest<[0, 1, 2], result>()
	})
	test("reify", () => {
		const append = ((element: unknown, to: readonly unknown[]) => [
			...to,
			element
		]) as Hkt.apply<Hkt.Reify, AppendKind>
		const result = append([2, [0, 1]])
		attest<[0, 1, 2]>(result)
	})
})

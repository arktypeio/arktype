import { attest } from "@arktype/attest"
import type { conform, Hkt } from "@arktype/util"

describe("hkt", () => {
	interface AppendKind extends Hkt.Kind {
		f: (
			args: conform<
				this[Hkt.key],
				readonly [element: unknown, to: readonly unknown[]]
			>
		) => [...(typeof args)[1], (typeof args)[0]]
	}
	it("base", () => {
		type result = Hkt.apply<AppendKind, [2, [0, 1]]>
		attest<[0, 1, 2], result>()
	})
	it("reify", () => {
		const append = (([element, to]: [unknown, readonly unknown[]]) => [
			...to,
			element
		]) as Hkt.apply<Hkt.Reify, AppendKind>
		const result = append([2, [0, 1]])
		attest<[0, 1, 2]>(result)
	})
})

import { attest } from "@arktype/attest"
import type { conform, Hkt, List } from "@arktype/util"

describe("hkt", () => {
	interface AppendKind extends Hkt.Kind {
		f: (
			args: conform<this[Hkt.key], readonly [element: unknown, to: List]>
		) => [...(typeof args)[1], (typeof args)[0]]
	}
	it("base", () => {
		type result = Hkt.apply<AppendKind, [2, [0, 1]]>
		attest<[0, 1, 2], result>()
	})
	it("reify", () => {
		const append = (([element, to]: [unknown, List]) => [
			...to,
			element
		]) as Hkt.apply<Hkt.Reify, AppendKind>
		const result = append([2, [0, 1]])
		attest<[0, 1, 2]>(result)
	})
})

import { attest, contextualize } from "@ark/attest"
import type { Hkt } from "@ark/util"

contextualize(() => {
	interface AppendKind<element = unknown>
		extends Hkt<[element: element, to: readonly element[]]> {
		return: [...this[1], this[0]]
	}

	it("base", () => {
		type result = Hkt.apply<AppendKind, [2, [0, 1]]>
		attest<[0, 1, 2], result>()
	})

	it("type error on unsatisfied constraint", () => {
		// @ts-expect-error
		attest((t: Hkt.apply<AppendKind, [2, 0]>) => {}).type.errors(
			"Type 'number' is not assignable to type 'readonly unknown[]'"
		)
	})
})

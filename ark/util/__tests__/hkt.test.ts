import { attest, contextualize } from "@ark/attest"
import type { Hkt, array, conform, show } from "@ark/util"

contextualize(() => {
	interface AppendKind extends Hkt.Kind {
		out: [...this[1], this[0]]
	}
	it("base", () => {
		type result = Hkt.apply<AppendKind, [2, [0, 1]]>
		attest<[0, 1, 2], result>()
	})
})

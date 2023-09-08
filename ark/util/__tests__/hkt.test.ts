import { attest } from "@arktype/attest"
import type { conform, Hkt } from "@arktype/util"
import { suite, test } from "mocha"

suite("kinds", () => {
	test("base", () => {
		interface AppendKind extends Hkt {
			f: (
				args: conform<this[Hkt.In], [element: unknown, to: readonly unknown[]]>
			) => [...(typeof args)[1], (typeof args)[0]]
		}
		type result = Hkt.apply<AppendKind, [2, [0, 1]]>
		attest({} as result).typed as [0, 1, 2]
	})
})

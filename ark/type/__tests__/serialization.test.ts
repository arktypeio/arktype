import { attest, contextualize } from "@ark/attest"
import { rootNode } from "@ark/schema"
import { type } from "arktype"

contextualize(() => {
	it("builtin prototypes", () => {
		const a = type({
			age: "number"
		})

		const b = type({
			ages: a.array()
		})

		const c = rootNode(b.json as never)

		attest(b.json).equals(c.json)
	})
})

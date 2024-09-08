import { attest, contextualize } from "@ark/attest"
import { schema } from "@ark/schema"
import { type } from "arktype"

contextualize(() => {
	it("builtin prototypes", () => {
		const a = type({
			age: "number"
		})

		const b = type({
			ages: a.array()
		})

		const c = schema(b.json as never)

		attest(b.json).equals(c.json)
	})
})

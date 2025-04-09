import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"
import { type } from "arktype"

contextualize(() => {
	it("builtin prototypes", () => {
		const A = type({
			age: "number"
		})

		const B = type({
			ages: A.array()
		})

		const C = rootSchema(B.json as never)

		attest(B.json).equals(C.json)
	})
})

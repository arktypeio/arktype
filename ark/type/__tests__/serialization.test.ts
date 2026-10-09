import { attest, contextualize } from "@ark/attest"
import { rootSchema, toJson } from "@ark/schema"
import { type } from "arktype"

contextualize(() => {
	it("built-in prototypes", () => {
		const A = type({
			age: "number"
		})

		const B = type({
			ages: A.array()
		})

		const C = rootSchema(toJson(B) as never)

		attest(toJson(B)).equals(toJson(C))
	})
})

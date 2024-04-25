import { attest, contextualize } from "@arktype/attest"
import { schemaScope } from "@arktype/schema"

contextualize(() => {
	it("base", () => {
		const types = schemaScope({
			a: {
				domain: "object",
				prop: {
					key: "b",
					value: "$b"
				}
			},
			b: {
				domain: "object",
				prop: {
					key: "a",
					value: "$a"
				}
			}
		}).export()

		const a = {} as { b: typeof b }
		const b = { a }
		a.b = b

		attest(types.a(a)).equals(a)
	})
})

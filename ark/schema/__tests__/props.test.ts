import { attest, contextualize } from "@arktype/attest"
import { schema } from "@arktype/schema"

contextualize(() => {
	it("normalizes prop order", () => {
		const l = schema({
			domain: "object",
			prop: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const r = schema({
			domain: "object",
			prop: [
				{ key: "b", value: "number" },
				{ key: "a", value: "string" }
			]
		})
		attest(l.json).equals(r.json)
	})
})

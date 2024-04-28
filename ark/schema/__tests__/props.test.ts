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
	it("strict intersection", () => {
		const l = schema({
			domain: "object",
			prop: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const r = schema({
			domain: "object",
			prop: [{ key: "a", value: "string" }],
			onExtraneousKey: "throw"
		})

		attest(() => l.and(r)).throws.snap(
			"ParseError: Intersection at b of true and false results in an unsatisfiable type"
		)
	})
})

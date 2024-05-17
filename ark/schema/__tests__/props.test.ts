import { attest, contextualize } from "@arktype/attest"
import { schema } from "@arktype/schema"

contextualize(() => {
	it("normalizes prop order", () => {
		const l = schema({
			domain: "object",
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const r = schema({
			domain: "object",
			required: [
				{ key: "b", value: "number" },
				{ key: "a", value: "string" }
			]
		})
		attest(l.json).equals(r.json)
	})
	it("undeclared key intersection", () => {
		const l = schema({
			domain: "object",
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const r = schema({
			domain: "object",
			required: [{ key: "a", value: "string" }],
			undeclared: "reject"
		})

		attest(() => l.and(r)).throws.snap(
			"ParseError: Intersection at b of number and never results in an unsatisfiable type"
		)
	})
})

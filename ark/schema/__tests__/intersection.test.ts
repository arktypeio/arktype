import { attest, contextualize } from "@arktype/attest"
import { schema } from "@arktype/schema"

contextualize(() => {
	it("normalizes refinement order", () => {
		const l = schema({
			domain: "number",
			divisor: 3,
			min: 5
		})
		const r = schema({
			domain: "number",
			min: 5,
			divisor: 3
		})
		attest(l.json).equals(r.json)
	})

	it("multiple constraints", () => {
		const n = schema({
			domain: "number",
			divisor: 3,
			min: 5
		})
		attest(n.allows(6)).snap(true)
		attest(n.allows(4)).snap(false)
		attest(n.allows(7)).snap(false)
	})
})

import { attest, contextualize } from "@ark/attest"
import { rootNode } from "@ark/schema"

contextualize(() => {
	it("normalizes refinement order", () => {
		const l = rootNode({
			domain: "number",
			divisor: 3,
			min: 5
		})
		const r = rootNode({
			domain: "number",
			min: 5,
			divisor: 3
		})
		attest(l.json).equals(r.json)
	})

	it("multiple constraints", () => {
		const n = rootNode({
			domain: "number",
			divisor: 3,
			min: 5
		})
		attest(n.allows(6)).snap(true)
		attest(n.allows(4)).snap(false)
		attest(n.allows(7)).snap(false)
	})
})

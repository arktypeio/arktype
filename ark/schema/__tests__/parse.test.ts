import { attest, contextualize } from "@ark/attest"
import { rootNode } from "@ark/schema"

contextualize(() => {
	it("single constraint", () => {
		const t = rootNode({ domain: "string", pattern: ".*" })
		attest(t.json).snap({ domain: "string", pattern: [".*"] })
	})

	it("multiple constraints", () => {
		const l = rootNode({
			domain: "number",
			divisor: 3,
			min: 5
		})
		const r = rootNode({
			domain: "number",
			divisor: 5
		})
		const result = l.and(r)

		attest(result.json).snap({
			domain: "number",
			divisor: 15,
			min: 5
		})
	})

	it("throws on reduced minLength disjoint", () => {
		attest(() =>
			rootNode({
				proto: Array,
				maxLength: 0,
				sequence: {
					prefix: ["number"],
					variadic: "number"
				}
			})
		).throws.snap(
			"ParseError: Intersection of <= 0 and >= 1 results in an unsatisfiable type"
		)
	})
})

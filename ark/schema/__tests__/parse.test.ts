import { attest, contextualize } from "@ark/attest"
import { registerNodeId, rootSchema } from "@ark/schema"

contextualize(() => {
	it("keeps ids unique when a prefix ends in a digit", () => {
		const ids = new Set<string>()
		for (let i = 0; i < 12; i++) ids.add(registerNodeId("unique1"))
		for (let i = 0; i < 2; i++) ids.add(registerNodeId("unique11"))

		attest(ids.size).equals(14)
	})

	it("single constraint", () => {
		const T = rootSchema({ domain: "string", pattern: ".*" })
		attest(T.json).snap({ domain: "string", pattern: [".*"] })
	})

	it("multiple constraints", () => {
		const L = rootSchema({
			domain: "number",
			divisor: 3,
			min: 5
		})
		const R = rootSchema({
			domain: "number",
			divisor: 5
		})
		const T = L.and(R)

		attest(T.json).snap({
			domain: "number",
			divisor: 15,
			min: 5
		})
	})

	it("throws on reduced minLength disjoint", () => {
		attest(() =>
			rootSchema({
				proto: Array,
				maxLength: 0,
				sequence: {
					prefix: ["number"],
					variadic: "number"
				}
			})
		).throws.snap(
			"ParseError: Intersection of == 0 and >= 1 results in an unsatisfiable type"
		)
	})
})

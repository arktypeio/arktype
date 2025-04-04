import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"

contextualize(() => {
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

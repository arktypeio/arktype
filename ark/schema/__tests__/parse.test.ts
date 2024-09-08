import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"

contextualize(() => {
	it("single constraint", () => {
		const t = rootSchema({ domain: "string", pattern: ".*" })
		attest(t.json).snap({ domain: "string", pattern: [".*"] })
	})

	it("multiple constraints", () => {
		const l = rootSchema({
			domain: "number",
			divisor: 3,
			min: 5
		})
		const r = rootSchema({
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

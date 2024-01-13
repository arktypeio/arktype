import { attest } from "@arktype/attest"
import { rootNode, schema, type Disjoint } from "@arktype/schema"

describe("intersections", () => {
	it("normalizes refinement order", () => {
		const l = schema({
			basis: "number",
			divisor: 3,
			min: 5
		})
		const r = schema({
			basis: "number",
			min: 5,
			divisor: 3
		})
		attest(l.innerId).equals(r.innerId)
	})
	it("orthogonal refinements intersect as null", () => {
		const l = rootNode("divisor", 5)
		const r = rootNode("max", 100)
		const result = l.intersect(r)
		attest<null>(result).equals(null)
	})
	it("possibly disjoint refinements", () => {
		const l = rootNode("min", 2)
		const r = rootNode("max", 1)
		const lrResult = l.intersect(r)
		attest<Disjoint | null>(lrResult)
		const rlResult = r.intersect(l)
		attest<Disjoint | null>(rlResult)
	})
	it("doesn't equate optional and required props", () => {
		const l = rootNode("required", { key: "a", value: "number" })
		const r = rootNode("optional", { key: "a", value: "number" })
		attest(l.equals(r)).equals(false)
	})

	// TODO:
	// it("strict intersection", () => {
	// 	const T = type(
	// 		{
	// 			a: "number",
	// 			b: "number"
	// 		},
	// 		{ keys: "strict" }
	// 	)
	// 	const U = type(
	// 		{
	// 			a: "number"
	// 		},
	// 		{ keys: "strict" }
	// 	)

	// 	const i = intersection(T, U)
	// 	//  const i: Type<{ a: number; b: number;}>
	// })
})

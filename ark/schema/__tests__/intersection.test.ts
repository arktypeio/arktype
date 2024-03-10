import { attest } from "@arktype/attest"
import { schema } from "@arktype/schema"

describe("intersections", () => {
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
		attest(l.innerId).equals(r.innerId)
	})
	it("doesn't equate optional and required props", () => {
		const l = schema("required", { key: "a", value: "number" })
		const r = schema("optional", { key: "a", value: "number" })
		attest(l.equals(r)).equals(false)
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

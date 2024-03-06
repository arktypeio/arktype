import { attest } from "@arktype/attest"
import { rootNode, schema } from "@arktype/schema"

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

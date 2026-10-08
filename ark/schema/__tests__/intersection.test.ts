import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"

contextualize(() => {
	it("normalizes refinement order", () => {
		const L = rootSchema({
			domain: "number",
			divisor: 3,
			min: 5
		})
		const R = rootSchema({
			domain: "number",
			min: 5,
			divisor: 3
		})
		attest(L.json).equals(R.json)
	})

	it("multiple constraints", () => {
		const n = rootSchema({
			domain: "number",
			divisor: 3,
			min: 5
		})
		attest(n.allows(6)).snap(true)
		attest(n.allows(4)).snap(false)
		attest(n.allows(7)).snap(false)
	})

	it("index narrowed to optional props", () => {
		const L = rootSchema({
			domain: "object",
			optional: [{ key: "a", value: "number" }],
			undeclared: "reject"
		})
		const R = rootSchema({
			domain: "object",
			index: [{ signature: "string", value: "number" }]
		})
		const T = L.and(R)
		attest(T.expression).snap("{ a?: number, + (undeclared): reject }")
		attest(T.allows({})).equals(true)
	})

	it("Disjoint orientation", () => {
		const L = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }],
			undeclared: "reject"
		})
		const R = rootSchema({
			domain: "object",
			index: [{ signature: "string", value: "number" }]
		})
		attest(() => R.and(L)).throws(
			"Intersection at a of number and string results in an unsatisfiable type"
		)
		attest(() => L.and(R)).throws(
			"Intersection at a of string and number results in an unsatisfiable type"
		)
	})
})

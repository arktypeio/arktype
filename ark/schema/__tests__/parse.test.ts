import { attest, contextualize } from "@arktype/attest"
import { type Root, schema } from "@arktype/schema"

contextualize(() => {
	it("single constraint", () => {
		const t = schema({ domain: "string", pattern: ".*" })
		attest<Root<string>>(t)
		attest(t.json).snap({ domain: "string", pattern: [".*"] })
	})

	it("multiple constraints", () => {
		const l = schema({
			domain: "number",
			divisor: 3,
			min: 5
		})
		const r = schema({
			domain: "number",
			divisor: 5
		})
		const result = l.and(r)
		attest<Root<number>>(result)
		attest(result.json).snap({
			domain: "number",
			divisor: 15,
			min: 5
		})
	})

	it("throws on reduced minLength disjoint", () => {
		attest(() =>
			schema({
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

	// it("errors on all unknown keys", () => {
	// 	attest(() => node({ foo: "bar", bar: "baz" }))
	// })
	// it("errors on unknown intersection key", () => {
	// 	// @ts-expect-error
	// 	attest(() => node({ foo: "bar", description:  "baz" }))
	// 		.throws.snap("Error: Key foo is not valid on intersection schema")
	// 		.type.errors.snap("Type 'string' is not assignable to type 'never'.")
	// })
	// TODO: Error here
	// it("errors on unknown morph key", () => {
	// 	// @ts-expect-error
	// 	attest(() => node({ morph: () => true, foo: "string" }))
	// 		.throws.snap()
	// 		.type.errors.snap()
	// })
})

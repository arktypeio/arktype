import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"

contextualize(() => {
	it("normalizes prop order", () => {
		const l = rootSchema({
			domain: "object",
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const r = rootSchema({
			domain: "object",
			required: [
				{ key: "b", value: "number" },
				{ key: "a", value: "string" }
			]
		})
		attest(l.json).equals(r.json)
	})

	it("preserves matching literal", () => {
		const l = rootSchema({
			domain: "object",
			index: [{ signature: "string", value: "string" }],
			undeclared: "reject"
		})

		const r = rootSchema({
			domain: "object",
			required: [{ key: "a", value: { unit: "foo" } }]
		})

		const result = l.and(r)

		attest(result.json).snap({
			undeclared: "reject",
			required: [{ key: "a", value: { unit: "foo" } }],
			index: [{ value: "string", signature: "string" }],
			domain: "object"
		})
	})

	it("preserves matching index", () => {
		const l = rootSchema({
			domain: "object",
			index: [{ signature: "string", value: "string" }],
			undeclared: "reject"
		})

		const r = rootSchema({
			domain: "object",
			index: [{ signature: "string", value: { unit: "foo" } }]
		})

		const result = l.and(r)

		attest(result.json).snap({
			undeclared: "reject",
			index: [{ signature: "string", value: { unit: "foo" } }],
			domain: "object"
		})
	})

	const startingWithA = rootSchema({ domain: "string", pattern: /^a.*/ })

	const endingWithZ = rootSchema({ domain: "string", pattern: /.*z$/ })

	const startingWithAAndEndingWithZ = rootSchema({
		domain: "string",
		pattern: [/^a.*/, /.*z$/]
	})

	it("intersects nonsubtype index signatures", () => {
		const l = rootSchema({
			domain: "object",
			index: [{ signature: startingWithA, value: "string" }],
			undeclared: "reject"
		})

		const r = rootSchema({
			domain: "object",
			index: [{ signature: endingWithZ, value: { unit: "foo" } }]
		})

		const result = l.and(r)

		const expected = rootSchema({
			domain: "object",
			index: [
				{ signature: startingWithA, value: "string" },
				{ signature: startingWithAAndEndingWithZ, value: { unit: "foo" } }
			],
			undeclared: "reject"
		})

		attest(result.json).snap(expected.json)
	})

	it("intersects non-subtype strict index signatures", () => {
		const l = rootSchema({
			domain: "object",
			index: [{ signature: startingWithA, value: endingWithZ }],
			undeclared: "reject"
		})

		const r = rootSchema({
			domain: "object",
			index: [{ signature: endingWithZ, value: startingWithA }],
			undeclared: "reject"
		})

		const result = l.and(r)

		const expected = rootSchema({
			domain: "object",
			index: [
				{
					signature: startingWithAAndEndingWithZ,
					value: startingWithAAndEndingWithZ
				}
			],
			undeclared: "reject"
		})

		attest(result.json).equals(expected.json)
	})

	it("prunes undeclared optional", () => {
		const l = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }],
			undeclared: "reject"
		})

		const r = rootSchema({
			domain: "object",
			optional: [{ key: "b", value: "number" }]
		})

		const result = l.and(r)

		attest(result.json).snap(l.json)
	})

	it("prunes undeclared index", () => {
		const l = rootSchema({
			domain: "object",
			index: [{ signature: "string", value: "string" }]
		})

		const r = rootSchema({
			domain: "object",
			required: [{ key: "a", value: { unit: "foo" } }],
			undeclared: "reject"
		})

		const result = l.and(r)

		attest(result.json).snap({
			undeclared: "reject",
			required: [{ key: "a", value: { unit: "foo" } }],
			domain: "object"
		})
	})

	it("undeclared required", () => {
		const l = rootSchema({
			domain: "object",
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const r = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }],
			undeclared: "reject"
		})

		attest(() => l.and(r)).throws.snap(
			"ParseError: Intersection at b of number and never results in an unsatisfiable type"
		)
	})

	it("delete & reject", () => {
		const l = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }],
			undeclared: "delete"
		})
		const r = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }],
			undeclared: "reject"
		})

		const result = l.and(r)

		attest(result.json).equals(r.json)
	})
})

import { attest, contextualize } from "@ark/attest"
import { rootSchema, toJson } from "@ark/schema"

contextualize(() => {
	it("normalizes prop order", () => {
		const L = rootSchema({
			domain: "object",
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const R = rootSchema({
			domain: "object",
			required: [
				{ key: "b", value: "number" },
				{ key: "a", value: "string" }
			]
		})
		attest(toJson(L)).equals(toJson(R))
	})

	it("preserves matching literal", () => {
		const L = rootSchema({
			domain: "object",
			index: [{ signature: "string", value: "string" }],
			undeclared: "reject"
		})

		const R = rootSchema({
			domain: "object",
			required: [{ key: "a", value: { unit: "foo" } }]
		})

		const T = L.and(R)

		attest(toJson(T)).snap({
			undeclared: "reject",
			required: [{ key: "a", value: { unit: "foo" } }],
			index: [{ value: "string", signature: "string" }],
			domain: "object"
		})
	})

	it("preserves matching index", () => {
		const L = rootSchema({
			domain: "object",
			index: [{ signature: "string", value: "string" }],
			undeclared: "reject"
		})

		const R = rootSchema({
			domain: "object",
			index: [{ signature: "string", value: { unit: "foo" } }]
		})

		const T = L.and(R)

		attest(toJson(T)).snap({
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
		const L = rootSchema({
			domain: "object",
			index: [{ signature: startingWithA, value: "string" }],
			undeclared: "reject"
		})

		const R = rootSchema({
			domain: "object",
			index: [{ signature: endingWithZ, value: { unit: "foo" } }]
		})

		const Result = L.and(R)

		const Expected = rootSchema({
			domain: "object",
			index: [
				{ signature: startingWithA, value: "string" },
				{ signature: startingWithAAndEndingWithZ, value: { unit: "foo" } }
			],
			undeclared: "reject"
		})

		attest(toJson(Result)).snap(toJson(Expected))
	})

	it("intersects non-subtype strict index signatures", () => {
		const L = rootSchema({
			domain: "object",
			index: [{ signature: startingWithA, value: endingWithZ }],
			undeclared: "reject"
		})

		const R = rootSchema({
			domain: "object",
			index: [{ signature: endingWithZ, value: startingWithA }],
			undeclared: "reject"
		})

		const Result = L.and(R)

		const Expected = rootSchema({
			domain: "object",
			index: [
				{
					signature: startingWithAAndEndingWithZ,
					value: startingWithAAndEndingWithZ
				}
			],
			undeclared: "reject"
		})

		attest(toJson(Result)).equals(toJson(Expected))
	})

	it("prunes undeclared optional", () => {
		const L = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }],
			undeclared: "reject"
		})

		const R = rootSchema({
			domain: "object",
			optional: [{ key: "b", value: "number" }]
		})

		const T = L.and(R)

		attest(toJson(T)).snap(toJson(L))
	})

	it("prunes undeclared index", () => {
		const L = rootSchema({
			domain: "object",
			index: [{ signature: "string", value: "string" }]
		})

		const R = rootSchema({
			domain: "object",
			required: [{ key: "a", value: { unit: "foo" } }],
			undeclared: "reject"
		})

		const T = L.and(R)

		attest(toJson(T)).snap({
			undeclared: "reject",
			required: [{ key: "a", value: { unit: "foo" } }],
			domain: "object"
		})
	})

	it("undeclared required", () => {
		const L = rootSchema({
			domain: "object",
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const R = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }],
			undeclared: "reject"
		})

		attest(() => L.and(R)).throws.snap(
			"ParseError: Intersection at b of number and never results in an unsatisfiable type"
		)
	})

	it("delete & reject", () => {
		const L = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }],
			undeclared: "delete"
		})
		const R = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }],
			undeclared: "reject"
		})

		const T = L.and(R)

		attest(toJson(T)).equals(toJson(R))
	})
})

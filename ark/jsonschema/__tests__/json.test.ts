import { attest, contextualize } from "@ark/attest"
import { parseJsonSchema } from "@ark/jsonschema"

contextualize(() => {
	it("array", () => {
		// unknown[]
		const parsedJsonSchemaArray = parseJsonSchema({ type: "array" } as const)
		attest(parsedJsonSchemaArray.json).snap({ proto: "Array" })

		// number[]
		const parsedJsonSchemaArrayVariadic = parseJsonSchema({
			type: "array",
			items: { type: "number", minimum: 3 }
		} as const)
		attest(parsedJsonSchemaArrayVariadic.json).snap({
			proto: "Array",
			sequence: { domain: "number", min: 3 }
		})

		// [string]
		const parsedJsonSchemaArrayFixed = parseJsonSchema({
			type: "array",
			items: [{ type: "string" }]
		} as const)
		attest(parsedJsonSchemaArrayFixed.json).snap({
			exactLength: 1,
			proto: "Array",
			sequence: { prefix: ["string"] }
		})

		// [string, ...number[]]
		const parsedJsonSchemaArrayFixedWithVariadic = parseJsonSchema({
			type: "array",
			items: [{ type: "string" }],
			additionalItems: { type: "number" }
		} as const)

		// Maximum Length
		const parsedJsonSchemaArrayMaxLength = parseJsonSchema({
			type: "array",
			items: { type: "string" },
			maxItems: 5
		} as const)

		// Minimum Length
		const parsedJsonSchemaArrayMinLength = parseJsonSchema({
			type: "array",
			items: { type: "number" },
			minItems: 3
		} as const)

		// Maximum & Minimum Length
		const parsedJsonSchemaArrayMaxAndMinLength = parseJsonSchema({
			type: "array",
			items: { type: "array", items: { type: "string" } },
			maxItems: 5,
			minItems: 3
		} as const)
	})

	it("number", () => {})

	it("object", () => {})

	it("string", () => {})
})

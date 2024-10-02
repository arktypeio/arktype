import { attest, contextualize } from "@ark/attest"
import { parseJsonSchema } from "@ark/jsonschema"
import type { applyConstraintSchema, number } from "arktype"

contextualize(() => {
	it("array", () => {
		// unknown[]
		const parsedJsonSchemaArray = parseJsonSchema({ type: "array" } as const)
		attest<unknown[]>(parsedJsonSchemaArray.infer)
		attest(parsedJsonSchemaArray.json).snap({ proto: "Array" })

		// number[]
		const parsedJsonSchemaArrayVariadic = parseJsonSchema({
			type: "array",
			items: { type: "number", minimum: 3 }
		} as const)
		attest<number[]>(parsedJsonSchemaArrayVariadic.infer)
		attest(parsedJsonSchemaArrayVariadic.json).snap({
			proto: "Array",
			sequence: { domain: "number", min: 3 }
		})
		attest<number.atLeast<3>[]>(parsedJsonSchemaArrayVariadic.inferBrandableOut)

		// [string]
		const parsedJsonSchemaArrayFixed = parseJsonSchema({
			type: "array",
			items: [{ type: "string" }]
		} as const)
		attest<[string]>(parsedJsonSchemaArrayFixed.infer)
		attest(parsedJsonSchemaArrayFixed.json).snap({
			exactLength: 1,
			proto: "Array",
			sequence: { prefix: ["string"] }
		})

		// // [string, ...number[]]
		const parsedJsonSchemaArrayFixedWithVariadic = parseJsonSchema({
			type: "array",
			items: [{ type: "string" }],
			additionalItems: { type: "number" }
		} as const)
		attest<[string, ...number[]]>(parsedJsonSchemaArrayFixedWithVariadic.infer)

		// Maximum Length
		const parsedJsonSchemaArrayMaxLength = parseJsonSchema({
			type: "array",
			items: { type: "string" },
			maxItems: 5
		} as const)
		attest<string[]>(parsedJsonSchemaArrayMaxLength.infer)
		attest<applyConstraintSchema<string[], "maxLength", 5>>(
			parsedJsonSchemaArrayMaxLength.tOut
		)

		// Minimum Length
		const parsedJsonSchemaArrayMinLength = parseJsonSchema({
			type: "array",
			items: { type: "number" },
			minItems: 3
		} as const)
		attest<number[]>(parsedJsonSchemaArrayMinLength.infer)
		attest<applyConstraintSchema<number[], "minLength", 3>>(
			parsedJsonSchemaArrayMinLength.tOut
		)

		// Maximum & Minimum Length
		const parsedJsonSchemaArrayMaxAndMinLength = parseJsonSchema({
			type: "array",
			items: { type: "array", items: { type: "string" } },
			maxItems: 5,
			minItems: 3
		} as const)
		attest<string[][]>(parsedJsonSchemaArrayMaxAndMinLength.infer)
		attest<
			applyConstraintSchema<
				applyConstraintSchema<string[][], "maxLength", 5>,
				"minLength",
				3
			>
		>(parsedJsonSchemaArrayMaxAndMinLength.tOut)
	})

	it("number", () => {})

	it("object", () => {})

	it("string", () => {})
})

import { attest, contextualize } from "@ark/attest"
import {
	writeInvalidJsonSchemaTargetMessage,
	type StandardJSONSchemaV1,
	type StandardSchemaV1
} from "@ark/schema"
import type { promisable } from "@ark/util"
import { type } from "arktype"

contextualize(() => {
	it("validation conforms to spec", () => {
		const T = type({ foo: "string" })
		const standard: StandardSchemaV1<{ foo: string }> = T
		const standardOut = standard["~standard"].validate({
			foo: "bar"
		})
		attest<promisable<StandardSchemaV1.Result<{ foo: string }>>>(
			standardOut
		).equals({
			value: { foo: "bar" }
		})

		const badStandardOut = standard["~standard"].validate({
			foo: 5
		}) as StandardSchemaV1.FailureResult

		attest(badStandardOut.issues).instanceOf(type.errors)
		attest(badStandardOut.issues.toString()).snap(
			"foo must be a string (was a number)"
		)
	})

	it("can infer generic parameter from standard schema", () => {
		const acceptsStandardSchema = <T extends StandardSchemaV1>(
			schema: T
		): {
			input: StandardSchemaV1.InferInput<T>
			output: StandardSchemaV1.InferOutput<T>
		} => ({}) as never

		const result = acceptsStandardSchema(type({ foo: "string.numeric.parse" }))

		attest<{ foo: string }>(result.input)
		attest<{ foo: number }>(result.output)
	})

	describe("~standard.jsonSchema", () => {
		it("generates input schema with draft-2020-12", () => {
			const T = type({ foo: "string" })
			const standard: StandardJSONSchemaV1 = T
			const jsonSchema = standard["~standard"].jsonSchema.input({
				target: "draft-2020-12"
			})
			attest(jsonSchema).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo"]
			})
		})

		it("generates output schema with draft-2020-12", () => {
			const T = type({ foo: "string" })
			const standard: StandardJSONSchemaV1 = T
			const jsonSchema = standard["~standard"].jsonSchema.output({
				target: "draft-2020-12"
			})
			attest(jsonSchema).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo"]
			})
		})

		it("generates input schema with draft-07", () => {
			const T = type({ foo: "string" })
			const standard: StandardJSONSchemaV1 = T
			const jsonSchema = standard["~standard"].jsonSchema.input({
				target: "draft-07"
			})
			attest(jsonSchema).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo"]
			})
		})

		it("generates output schema with draft-07", () => {
			const T = type({ foo: "string" })
			const standard: StandardJSONSchemaV1 = T
			const jsonSchema = standard["~standard"].jsonSchema.output({
				target: "draft-07"
			})
			attest(jsonSchema).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo"]
			})
		})

		it("generates input schema with openapi-3.0", () => {
			const T = type({ foo: "string | null" })
			const standard: StandardJSONSchemaV1 = T
			const jsonSchema = standard["~standard"].jsonSchema.input({
				target: "openapi-3.0"
			})
			attest(jsonSchema).snap({
				type: "object",
				properties: { foo: { type: "string", nullable: true } },
				required: ["foo"]
			})
		})

		it("generates output schema with openapi-3.0", () => {
			const T = type({ foo: "string | null" })
			const standard: StandardJSONSchemaV1 = T
			const jsonSchema = standard["~standard"].jsonSchema.output({
				target: "openapi-3.0"
			})
			attest(jsonSchema).snap({
				type: "object",
				properties: { foo: { type: "string", nullable: true } },
				required: ["foo"]
			})
		})

		it("passes libraryOptions to toJsonSchema", () => {
			const T = type({ foo: "string" })
			const standard: StandardJSONSchemaV1 = T
			const jsonSchema = standard["~standard"].jsonSchema.input({
				target: "draft-2020-12",
				libraryOptions: {
					dialect: null
				}
			})
			attest(jsonSchema).snap({
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo"]
			})
		})

		it("throws for unsupported target", () => {
			const T = type({ foo: "string" })
			const standard: StandardJSONSchemaV1 = T
			attest(() =>
				standard["~standard"].jsonSchema.input({
					target: "draft-04"
				})
			).throws(writeInvalidJsonSchemaTargetMessage("draft-04"))
		})

		it("converts what JSON Schema can't represent to {}", () => {
			const T = type({
				big: "bigint",
				date: "Date",
				maybe: "string | undefined",
				even: type("number").narrow(n => n % 2 === 0),
				ends: ["...", "string[]", "number"],
				count: ["bigint", "=", () => 0n]
			})
			const standard: StandardJSONSchemaV1 = T
			attest(
				standard["~standard"].jsonSchema.input({ target: "draft-2020-12" })
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: {
					big: {},
					date: {},
					ends: { type: "array", minItems: 1 },
					even: { type: "number" },
					maybe: { anyOf: [{ type: "string" }, {}] },
					count: {}
				},
				required: ["big", "date", "ends", "even", "maybe"]
			})
		})

		it("converts the output of a transform to {}", () => {
			const T = type("string").pipe(s => s.length)
			const standard: StandardJSONSchemaV1 = T
			attest(
				standard["~standard"].jsonSchema.output({ target: "draft-2020-12" })
			).snap({ $schema: "https://json-schema.org/draft/2020-12/schema" })
		})

		it("keeps a postfix tuple's draft-07 prefix", () => {
			const T = type(["string", "...", "number[]", "boolean"])
			const standard: StandardJSONSchemaV1 = T
			attest(
				standard["~standard"].jsonSchema.input({ target: "draft-07" })
			).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "array",
				minItems: 2,
				items: [{ type: "string" }]
			})
		})

		it("approximates an openapi-3.0 tuple with a union of its elements", () => {
			const T = type(["string", "number?"])
			const standard: StandardJSONSchemaV1 = T
			attest(
				standard["~standard"].jsonSchema.input({ target: "openapi-3.0" })
			).snap({
				type: "array",
				items: { anyOf: [{ type: "string" }, { type: "number" }] },
				maxItems: 2,
				minItems: 1
			})
		})

		it("omits an openapi-3.0 pattern key", () => {
			const T = type({ "[/^a/]": "string", b: "number" })
			const standard: StandardJSONSchemaV1 = T
			attest(
				standard["~standard"].jsonSchema.input({ target: "openapi-3.0" })
			).snap({
				type: "object",
				properties: { b: { type: "number" } },
				required: ["b"]
			})
		})

		it("uses configured fallbacks", () => {
			const T = type("bigint")
			const standard: StandardJSONSchemaV1 = T
			attest(
				standard["~standard"].jsonSchema.input({
					target: "draft-2020-12",
					libraryOptions: {
						fallback: { domain: () => ({ type: "integer" }) }
					}
				})
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "integer"
			})
		})

		it("generates different input/output schemas for morphs", () => {
			const T = type({ foo: "string.numeric.parse" })
			const standard: StandardJSONSchemaV1 = T

			const inputSchema = standard["~standard"].jsonSchema.input({
				target: "draft-2020-12"
			})
			attest(inputSchema).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: {
					foo: {
						type: "string",
						pattern:
							"^(?:(?!^-0\\.?0*$)(?:-?(?:(?:0|[1-9]\\d*)(?:\\.\\d+)?)|\\.\\d+?))$"
					}
				},
				required: ["foo"]
			})

			const outputSchema = standard["~standard"].jsonSchema.output({
				target: "draft-2020-12"
			})
			attest(outputSchema).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: { foo: { type: "number" } },
				required: ["foo"]
			})
		})
	})
})

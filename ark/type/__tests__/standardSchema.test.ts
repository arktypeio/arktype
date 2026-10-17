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
					target: "openapi-3.0"
				})
			).throws(writeInvalidJsonSchemaTargetMessage("openapi-3.0"))
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

		it("includes defaults in input schema", () => {
			const T = type({
				name: 'string = "Anon"',
				count: "number = 0",
				tags: ["string[]", "=", () => ["a"]]
			})
			const standard: StandardJSONSchemaV1 = T
			attest(
				standard["~standard"].jsonSchema.input({ target: "draft-2020-12" })
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: {
					count: { type: "number", default: 0 },
					name: { type: "string", default: "Anon" },
					tags: { type: "array", items: { type: "string" }, default: ["a"] }
				}
			})
			attest(
				standard["~standard"].jsonSchema.output({ target: "draft-2020-12" })
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: {
					count: { type: "number" },
					name: { type: "string" },
					tags: { type: "array", items: { type: "string" } }
				},
				required: ["count", "name", "tags"]
			})
		})

		it("includes defaults in input schema for tuples and morph inputs", () => {
			const Tuple = type(["number", "string = 'x'"])
			attest(
				(Tuple as StandardJSONSchemaV1)["~standard"].jsonSchema.input({
					target: "draft-2020-12"
				})
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "array",
				minItems: 1,
				prefixItems: [{ type: "number" }, { type: "string", default: "x" }],
				items: false
			})

			const Parsed = type({ n: "string.numeric.parse = '1'" })
			attest(
				(Parsed as StandardJSONSchemaV1)["~standard"].jsonSchema.input({
					target: "draft-2020-12"
				})
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: {
					n: {
						type: "string",
						pattern:
							"^(?:(?!^-0\\.?0*$)(?:-?(?:(?:0|[1-9]\\d*)(?:\\.\\d+)?)|\\.\\d+?))$",
						default: "1"
					}
				}
			})
		})

		it("allows undeclared keys that would be deleted in input schema", () => {
			const T = type({ name: 'string = "Anon"' }).onUndeclaredKey("delete")
			const standard: StandardJSONSchemaV1 = T
			attest(
				standard["~standard"].jsonSchema.input({ target: "draft-2020-12" })
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: { name: { type: "string", default: "Anon" } }
			})
			attest(
				standard["~standard"].jsonSchema.output({ target: "draft-2020-12" })
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: { name: { type: "string" } },
				required: ["name"],
				additionalProperties: false
			})
		})

		it("does not use a configured morph fallback for input schema", () => {
			const T = type({ foo: "string.numeric.parse" })
			const standard: StandardJSONSchemaV1 = T
			attest(
				standard["~standard"].jsonSchema.input({
					target: "draft-2020-12",
					libraryOptions: {
						fallback: { morph: () => ({ type: "null" }) }
					}
				})
			).snap({
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

import { attest, contextualize } from "@ark/attest"
import { annotatingFallback, rootSchema, type ToJsonSchema } from "@ark/schema"
import { Ajv } from "ajv"
import { Ajv2020 } from "ajv/dist/2020.js"
import { toJsonSchema } from "arksets"

const ajv2020 = new Ajv2020({ strict: false, validateFormats: false })
const ajv07 = new Ajv({ strict: false, validateFormats: false })

const openApiPrefixFallback: ToJsonSchema.Options["fallback"] = {
	arrayPrefix: ctx => ctx.base
}

contextualize(() => {
	describe("tuple length bounds (#5)", () => {
		it("keeps tighter minItems on optional tuples across targets", () => {
			const T = rootSchema({
				proto: Array,
				sequence: { prefix: ["string"], optionals: ["number"] }
			}).and({ proto: Array, minLength: 2 })

			const schema2020 = toJsonSchema(T)
			attest(schema2020).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "array",
				minItems: 2,
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})

			const schema07 = toJsonSchema(T, { target: "draft-07" })
			attest(schema07).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "array",
				minItems: 2,
				items: [{ type: "string" }, { type: "number" }],
				additionalItems: false
			})

			attest(toJsonSchema(T, { target: "openapi-3.1" })).snap({
				type: "array",
				minItems: 2,
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})

			attest(
				toJsonSchema(T, {
					target: "openapi-3.0",
					fallback: openApiPrefixFallback
				})
			).snap({
				type: "array",
				items: {},
				minItems: 2,
				maxItems: 2
			})

			const v2020 = ajv2020.compile(schema2020)
			const v07 = ajv07.compile(schema07)
			for (const sample of [["a"], ["a", 1], ["a", 1, 2]]) {
				attest(v2020(sample)).equals(T.allows(sample))
				attest(v07(sample)).equals(T.allows(sample))
			}
		})

		it("keeps tighter minItems on variadic tuples across targets", () => {
			const T = rootSchema({
				proto: Array,
				sequence: { prefix: ["string"], variadic: "number" }
			}).and({ proto: Array, minLength: 3 })

			const schema2020 = toJsonSchema(T)
			attest(schema2020).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "array",
				minItems: 3,
				prefixItems: [{ type: "string" }],
				items: { type: "number" }
			})

			const schema07 = toJsonSchema(T, { target: "draft-07" })
			attest(schema07).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "array",
				minItems: 3,
				items: [{ type: "string" }],
				additionalItems: { type: "number" }
			})

			attest(toJsonSchema(T, { target: "openapi-3.1" })).snap({
				type: "array",
				minItems: 3,
				prefixItems: [{ type: "string" }],
				items: { type: "number" }
			})

			attest(
				toJsonSchema(T, {
					target: "openapi-3.0",
					fallback: {
						arrayPrefix: ctx => ({
							...ctx.base,
							items: { anyOf: [...ctx.elements, ctx.items!] }
						})
					}
				})
			).snap({
				type: "array",
				items: { anyOf: [{ type: "string" }, { type: "number" }] },
				minItems: 3
			})

			const v2020 = ajv2020.compile(schema2020)
			const v07 = ajv07.compile(schema07)
			for (const sample of [["a"], ["a", 1], ["a", 1, 2], ["a", 1, 2, 3]]) {
				attest(v2020(sample)).equals(T.allows(sample))
				attest(v07(sample)).equals(T.allows(sample))
			}
		})

		it("keeps tighter maxItems on non-variadic tuples across targets", () => {
			const T = rootSchema({
				proto: Array,
				sequence: { prefix: ["string"], optionals: ["number"] }
			}).and({ proto: Array, maxLength: 1 })

			const schema2020 = toJsonSchema(T)
			attest(schema2020).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "array",
				minItems: 1,
				maxItems: 1,
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})

			const schema07 = toJsonSchema(T, { target: "draft-07" })
			attest(schema07).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "array",
				minItems: 1,
				maxItems: 1,
				items: [{ type: "string" }, { type: "number" }],
				additionalItems: false
			})

			attest(toJsonSchema(T, { target: "openapi-3.1" })).snap({
				type: "array",
				minItems: 1,
				maxItems: 1,
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})

			attest(
				toJsonSchema(T, {
					target: "openapi-3.0",
					fallback: openApiPrefixFallback
				})
			).snap({
				type: "array",
				items: {},
				minItems: 1,
				maxItems: 1
			})

			const v2020 = ajv2020.compile(schema2020)
			const v07 = ajv07.compile(schema07)
			for (const sample of [[], ["a"], ["a", 1]]) {
				attest(v2020(sample)).equals(T.allows(sample))
				attest(v07(sample)).equals(T.allows(sample))
			}

			// optional-only tuple bounded by <= 1 (minLength 0)
			const OptOnly = rootSchema({
				proto: Array,
				sequence: { optionals: ["string", "number"] }
			}).and({ proto: Array, maxLength: 1 })
			attest(toJsonSchema(OptOnly, { dialect: null })).snap({
				type: "array",
				maxItems: 1,
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})
		})
	})

	describe("flagless regexes sensitive to u flag (#6)", () => {
		const uSensitivePatterns = [
			"^\\p{L}$",
			"^\\P{L}$",
			"^a\\-b$",
			"^\\u{61}$",
			"^[\\u{61}]$",
			"^{$"
		]

		it("routes flagless u-sensitive patterns to patternFlags fallback", () => {
			for (const pattern of uSensitivePatterns) {
				const T = rootSchema({ domain: "string", pattern })
				for (const target of [
					"draft-2020-12",
					"draft-07",
					"openapi-3.0",
					"openapi-3.1"
				] as const)
					attest(() => toJsonSchema(T, { target })).throws("patternFlags")

				attest(
					toJsonSchema(T, { dialect: null, fallback: annotatingFallback })
				).equals({
					type: "string",
					"x-arktype-patterns": [{ rule: pattern, flags: "" }]
				} as never)
			}
		})

		it("routes u-sensitive index key patterns away from patternProperties", () => {
			const T = rootSchema({
				domain: "object",
				index: {
					signature: { domain: "string", pattern: "^\\p{L}$" },
					value: "number"
				},
				undeclared: "reject"
			})
			attest(() => toJsonSchema(T)).throws("patternFlags")
		})

		it("continues writing ordinary flagless patterns directly across targets", () => {
			for (const pattern of [
				"^a+$",
				".*",
				"^.*$",
				".+",
				"^[a\\-b]$",
				"^[\\dA-Fa-f]+$",
				"^[^@]+$",
				"^\\S+$",
				// string.trim.preformatted / type("string.trim").out
				"^\\S[\\S\\s]*\\S$|^\\S?$",
				"^\\D+$",
				"^\\W+$",
				"^.$",
				"^😀$",
				"^\\\\p{1}$"
			]) {
				const T = rootSchema({ domain: "string", pattern })
				attest(toJsonSchema(T, { dialect: null })).equals({
					type: "string",
					pattern
				})
				for (const target of [
					"draft-2020-12",
					"draft-07",
					"openapi-3.0",
					"openapi-3.1"
				] as const) {
					attest(toJsonSchema(T, { target })).equals({
						...(target === "draft-2020-12" && {
							$schema: "https://json-schema.org/draft/2020-12/schema"
						}),
						...(target === "draft-07" && {
							$schema: "http://json-schema.org/draft-07/schema#"
						}),
						type: "string",
						pattern
					})
				}
			}
		})
	})

	describe("non-JSON examples and annotations (#13)", () => {
		it("omits non-JSON examples and converts valid Dates to ISO strings", () => {
			const Big = rootSchema("bigint").configure({ examples: [5n] })
			attest(
				toJsonSchema(Big, {
					dialect: null,
					fallback: { domain: ctx => ({ ...ctx.base, type: "integer" }) }
				})
			).snap({ type: "integer" })

			const At = rootSchema({
				domain: "object",
				required: [
					{
						key: "at",
						value: rootSchema("Date").configure({ examples: [new Date(0)] })
					}
				]
			})
			attest(
				toJsonSchema(At, {
					dialect: null,
					fallback: {
						date: ctx => ({
							...ctx.base,
							type: "string",
							format: "date-time"
						})
					}
				})
			).snap({
				type: "object",
				properties: {
					at: {
						type: "string",
						format: "date-time",
						examples: ["1970-01-01T00:00:00.000Z"]
					}
				},
				required: ["at"]
			})

			attest(
				toJsonSchema(At, {
					target: "openapi-3.0",
					fallback: {
						date: ctx => ({
							...ctx.base,
							type: "string",
							format: "date-time"
						})
					}
				})
			).snap({
				type: "object",
				properties: {
					at: {
						type: "string",
						format: "date-time",
						example: "1970-01-01T00:00:00.000Z"
					}
				},
				required: ["at"]
			})
		})

		it("filters mixed examples and non-JSON x- extensions without metaJson", () => {
			const Mixed = rootSchema({}).configure({
				examples: [
					5n,
					new Date(0),
					new Date(Number.NaN),
					undefined,
					() => {},
					Symbol("s"),
					"ok",
					{ at: new Date(0) },
					{ bad: 5n }
				],
				"x-date": new Date(0),
				"x-invalid-date": new Date(Number.NaN),
				"x-bigint": 5n,
				"x-symbol": Symbol("s"),
				"x-undef": undefined
			} as never)

			attest(toJsonSchema(Mixed, { dialect: null })).snap({
				examples: [
					"1970-01-01T00:00:00.000Z",
					"ok",
					{ at: "1970-01-01T00:00:00.000Z" }
				],
				"x-date": "1970-01-01T00:00:00.000Z"
			})

			const InvalidDateOnly = rootSchema("string").configure({
				examples: [new Date(Number.NaN)]
			})
			attest(toJsonSchema(InvalidDateOnly, { dialect: null })).snap({
				type: "string"
			})
		})
	})
})

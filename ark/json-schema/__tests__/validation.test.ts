import { attest, contextualize, getChecker } from "@ark/attest"
import { jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import type { JsonSchemaOrBoolean } from "@ark/schema"
import type { JsonSchema } from "arktype"

// checks inference without reading the schema at runtime
const inferred = <const schema>(
	schema: jsonSchema.validate<schema>
): jsonSchema.infer<schema> => schema as never

/** whether a (possibly hand-written, mutable) schema type is accepted as-is */
type isValid<schema> =
	[schema] extends [jsonSchema.validate<schema>] ? true : false

contextualize(() => {
	describe("valid keywords", () => {
		it("string keywords", () => {
			attest(() =>
				inferred({
					type: "string",
					minLength: 0,
					maxLength: 10,
					pattern: "^[a-z]+$",
					format: "email",
					contentEncoding: "base64",
					contentMediaType: "application/json",
					contentSchema: { type: "object" }
				})
			).type.errors.is("")
		})

		it("negative and fractional bounds are not counts", () => {
			const T = inferred({
				type: "number",
				minimum: -9007199254740991,
				maximum: -0.5
			})
			attest<number>(T).type.toString.snap("number")
		})

		it("object keywords", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" }, b: { type: "number" } },
				required: ["a"],
				additionalProperties: false,
				minProperties: 1,
				maxProperties: 2,
				propertyNames: { pattern: "^[a-z]$" },
				dependentRequired: { a: ["b"] },
				dependentSchemas: { b: { required: ["a"] } }
			})
			attest<{ a: string; b?: number }>(T).type.toString.snap(
				"{ a: string; b?: number }"
			)
		})

		it("draft-07 dependencies in both forms", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { a: { type: "string" }, b: { type: "number" } },
					dependencies: {
						a: ["b"],
						b: { properties: { c: { type: "boolean" } } }
					}
				})
			).type.errors.is("")
		})

		it("propertyNames variants", () => {
			attest(() =>
				inferred({
					type: "object",
					propertyNames: { type: "string", maxLength: 3 }
				})
			).type.errors.is("")
			attest(() =>
				inferred({ type: "object", propertyNames: { enum: ["a", "b"] } })
			).type.errors.is("")
			attest(() =>
				inferred({ type: "object", propertyNames: false })
			).type.errors.is("")
			attest(() =>
				inferred({
					$defs: { key: { type: "string", pattern: "^k" } },
					type: "object",
					propertyNames: { $ref: "#/$defs/key" }
				})
			).type.errors.is("")
		})

		it("array keywords", () => {
			const T = inferred({
				type: "array",
				items: { type: "string" },
				minItems: 0,
				maxItems: 3,
				uniqueItems: false,
				contains: { const: "a" },
				minContains: 0,
				maxContains: 2
			})
			attest<string[]>(T).type.toString.snap("string[]")
		})

		it("prefixItems with items", () => {
			const T = inferred({
				type: "array",
				prefixItems: [{ type: "string" }, true, false],
				items: { type: "number" },
				minItems: 1
			})
			attest<[string, unknown?, never?, ...number[]]>(T).type.toString.snap(
				"[string, unknown?, never?, ...number[]]"
			)
		})

		it("draft-07 items list with additionalItems", () => {
			const T = inferred({
				type: "array",
				items: [{ type: "string" }, { type: "number" }],
				additionalItems: { type: "boolean" },
				minItems: 2
			})
			attest<[string, number, ...boolean[]]>(T).type.toString.snap(
				"[string, number, ...boolean[]]"
			)
		})

		it("composition keywords", () => {
			attest(() =>
				inferred({
					allOf: [true, { type: "string" }],
					anyOf: [{ minLength: 1 }, { const: "" }],
					oneOf: [{ pattern: "^a" }, { pattern: "^b" }],
					not: { const: "c" },
					if: { maxLength: 3 },
					then: { pattern: "^x" },
					else: false
				})
			).type.errors.is("")
		})

		it("keywords of another type family are ignored, not errors", () => {
			const T = inferred({
				type: "string",
				minimum: 1,
				items: { type: "number" },
				properties: { a: { type: "string" } },
				minItems: 1
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("core keywords", () => {
			attest(() =>
				inferred({
					$schema: "https://json-schema.org/draft/2020-12/schema",
					$id: "https://example.com/node",
					$anchor: "node",
					$dynamicAnchor: "meta",
					$vocabulary: {
						"https://json-schema.org/draft/2020-12/vocab/core": true
					},
					$comment: "a comment",
					$defs: { a: { type: "string" } },
					definitions: { b: { type: "number" } },
					type: "string"
				})
			).type.errors.is("")
		})

		it("non-local refs", () => {
			attest(() =>
				inferred({
					anyOf: [
						{ $ref: "https://example.com/schema.json" },
						{ $ref: "other.json#/$defs/a" },
						{ $ref: "#node" }
					]
				})
			).type.errors.is("")
		})

		it("refs into any part of the root", () => {
			const T = inferred({
				type: "object",
				properties: {
					a: { type: "array", prefixItems: [{ type: "string" }] },
					b: { $ref: "#/properties/a/prefixItems/0" },
					c: { $ref: "#/properties/a" }
				}
			})
			attest<{
				a?: [string?, ...unknown[]]
				b?: string
				c?: [string?, ...unknown[]]
			}>(T).type.toString.snap(`{
	a?: [string?, ...unknown[]]
	b?: string
	c?: [string?, ...unknown[]]
}`)
		})

		it("refs inside definitions resolve against the root", () => {
			const T = inferred({
				$defs: {
					a: { $ref: "#/$defs/b" },
					b: { type: "string" }
				},
				type: "object",
				properties: { x: { $ref: "#/$defs/a" } }
			})
			attest<{ x?: string }>(T).type.toString.snap("{ x?: string }")
		})

		it("empty containers", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {},
					required: [],
					patternProperties: {},
					$defs: {}
				})
			).type.errors.is("")
			attest(() => inferred({ enum: [] })).type.errors.is("")
		})

		it("properties named like keywords", () => {
			const T = inferred({
				type: "object",
				properties: {
					type: { type: "string" },
					required: { type: "boolean" },
					properties: { type: "object" },
					$ref: { type: "string" },
					enum: { type: "array" },
					minLength: { type: "number" },
					const: true,
					default: false
				},
				required: ["type", "$ref", "minLength"]
			})
			attest<{
				type: string
				required?: boolean
				properties?: object
				$ref: string
				enum?: unknown[]
				minLength: number
				const?: unknown
				default?: never
			}>(T).type.toString.snap(`{
	type: string
	required?: boolean
	properties?: object
	$ref: string
	enum?: unknown[]
	minLength: number
	const?: unknown
	default?: never
}`)
		})

		it("$defs named like keywords", () => {
			attest<string>(
				inferred({
					$defs: { type: { type: "string" }, $ref: { type: "number" } },
					$ref: "#/$defs/type"
				})
			)
		})

		it("type with const or enum", () => {
			attest<"a">(inferred({ type: "string", const: "a" }))
			attest<1 | 2>(inferred({ type: "integer", enum: [1, 2, "3"] }))
		})

		it("nullable with type lists and enums", () => {
			const T = inferred({
				type: "object",
				properties: {
					a: { type: ["string", "number"], nullable: true },
					b: { enum: ["x", "y"], nullable: true },
					c: { type: "array", items: { type: "string" }, nullable: false }
				},
				required: ["a", "b", "c"]
			})
			attest<{ a: string | number | null; b: "x" | "y" | null; c: string[] }>(T)
				.type.toString.snap(`{
	a: string | number | null
	b: "x" | "y" | null
	c: string[]
}`)
		})

		it("lone conditional keywords", () => {
			attest<string>(inferred({ type: "string", if: { minLength: 1 } }))
			attest<string>(inferred({ type: "string", then: { minLength: 1 } }))
			attest<string>(inferred({ type: "string", else: { minLength: 1 } }))
		})

		it("keyword applying to one branch of a type list", () => {
			const T = inferred({
				type: ["string", "null", "array"],
				minLength: 1,
				items: { type: "number" },
				maxItems: 3
			})
			attest<string | null | number[]>(T).type.toString.snap(
				"string | number[] | null"
			)
		})

		it("unknown keywords in valid subschemas of an invalid schema", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { a: { type: "string", "x-order": 1 } },
					patternProperties: { "^_": { tsType: "any" } },
					allOf: [{ "x-b": true }],
					prefixItems: [{ "x-c": 1 }],
					// @ts-expect-error
					minLength: -1
				})
			).type.errors("minLength must be a non-negative integer (was -1)")
		})

		it("trivial subschemas", () => {
			attest(() =>
				inferred({
					type: "object",
					additionalProperties: {},
					patternProperties: { "^a": true, "^b": {} },
					propertyNames: true
				})
			).type.errors.is("")
			attest(() =>
				inferred({
					type: "array",
					prefixItems: [{}],
					items: {},
					contains: true
				})
			).type.errors.is("")
		})

		it("special property names", () => {
			const T = inferred({
				type: "object",
				properties: {
					"": { type: "string" },
					"a-b": { type: "number" },
					"a b": { type: "boolean" },
					$x: { type: "null" },
					constructor: { type: "string" },
					toString: { type: "string" },
					"a/b~c": { type: "number" }
				},
				required: ["", "a-b", "constructor", "toString", "a/b~c"]
			})
			attest<{
				"": string
				"a-b": number
				"a b"?: boolean
				$x?: null
				constructor: string
				toString: string
				"a/b~c": number
			}>(T).type.toString.snap(`{
	"": string
	"a-b": number
	"a b"?: boolean
	$x?: null
	constructor: string
	toString: string
	"a/b~c": number
}`)
		})

		it("refs to special property names", () => {
			const T = inferred({
				type: "object",
				properties: {
					"": { type: "string" },
					"a/b~c": { type: "number" },
					x: { $ref: "#/properties/" },
					y: { $ref: "#/properties/a~1b~0c" }
				},
				required: ["x", "y"]
			})
			attest<string>(T.x)
			attest<number>(T.y)
		})

		it("draft 2019-09 recursive keywords", () => {
			attest(() =>
				inferred({
					$recursiveAnchor: true,
					type: "object",
					// @ts-expect-error
					properties: { child: { $recursiveRef: "#" } }
				})
			).type.errors("$recursiveRef isn't supported by jsonSchemaToType")
		})
	})

	describe("valid annotations and unknown keywords", () => {
		it("annotations of unexpected kinds", () => {
			attest(() =>
				inferred({
					type: "number",
					title: 5,
					description: null,
					default: { a: [1, 2, { b: "c" }] },
					examples: "not an array",
					deprecated: "yes",
					readOnly: 1,
					$comment: ["array"]
				})
			).type.errors.is("")
		})

		it("x- extensions and unknown keywords", () => {
			const T = inferred({
				type: "object",
				"x-internal": true,
				"x-tags": ["a", "b"],
				"x-nested": { type: "strin", minLength: -1 },
				markdownDescription: "**bold**",
				errorMessage: { type: "must be an object" },
				defaultSnippets: [{ body: { a: "$1" } }],
				tsType: "any",
				properties: {
					a: {
						type: "string",
						"x-order": 1,
						deprecationMessage: "use b"
					}
				}
			})
			attest<{ a?: string }>(T).type.toString.snap("{ a?: string }")
		})

		it("schema with only unknown keywords", () => {
			attest<unknown>(inferred({ "x-foo": 1 }))
			attest<{ a?: unknown }>(
				inferred({ type: "object", properties: { a: { "x-foo": 1 } } })
			)
		})

		it("numeric keys", () => {
			attest(() => inferred({ type: "string", 0: "a" })).type.errors.is("")
		})
	})

	describe("data keywords are not validated as schemas", () => {
		it("const", () => {
			const T = inferred({
				const: { type: "strin", minLength: -1, required: "a" }
			})
			attest<{
				readonly type: "strin"
				readonly minLength: -1
				readonly required: "a"
			}>(T).type.toString.snap(`{
	readonly type: "strin"
	readonly minLength: -1
	readonly required: "a"
}`)
		})

		it("enum", () => {
			const T = inferred({
				enum: [{ $ref: "#/nowhere" }, { type: 5 }]
			})
			attest<{ readonly $ref: "#/nowhere" } | { readonly type: 5 }>(T).type
				.toString.snap(`	| { readonly $ref: "#/nowhere" }
	| { readonly type: 5 }`)
		})

		it("default and examples", () => {
			attest(() =>
				inferred({
					type: "object",
					default: { type: "strin", properties: 5 },
					examples: [{ $ref: "#/missing" }, { maxItems: 1.5 }]
				})
			).type.errors.is("")
		})

		it("nested const", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: { const: { additionalItems: true, items: {}, prefixItems: [] } },
						b: { const: { maximum: 1, exclusiveMaximum: 1 } },
						c: { const: { const: 1, enum: [1] } }
					}
				})
			).type.errors.is("")
		})
	})

	describe("valid widened values", () => {
		it("widened keyword values", () => {
			const minLength: number = 1
			const pattern: string = "^a"
			const format: string = "email"
			attest(() =>
				inferred({
					type: "string",
					minLength,
					maxLength: minLength,
					pattern,
					format
				})
			).type.errors.is("")
		})

		it("widened type name", () => {
			const name: string = "string"
			attest<unknown>(inferred({ type: name }))
		})

		it("widened type name union", () => {
			const name = "string" as "string" | "number"
			attest<string | number>(inferred({ type: name }))
		})

		it("widened required", () => {
			const required: string[] = ["a"]
			attest(() =>
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					required
				})
			).type.errors.is("")
		})

		it("widened ref", () => {
			const ref: string = "#/$defs/a"
			attest<unknown>(inferred({ $defs: { a: { type: "string" } }, $ref: ref }))
		})

		it("widened enum", () => {
			const values: unknown[] = []
			attest<unknown>(inferred({ enum: values }))
		})

		it("widened boolean keywords", () => {
			const flag: boolean = true
			attest(() =>
				inferred({
					type: "array",
					uniqueItems: flag,
					items: flag,
					nullable: flag
				})
			).type.errors.is("")
		})

		it("non-const object", () => {
			const schema = {
				type: "object",
				properties: { a: { type: "string", minLength: 1 } },
				required: ["a"]
			}
			attest<unknown>(jsonSchemaToType(schema).infer)
		})

		it("as const variable", () => {
			const schema = {
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"]
			} as const
			attest<{ a: string }>(jsonSchemaToType(schema).infer).type.toString.snap(
				"{ a: string }"
			)
		})

		it("any keyword values at the root and nested", () => {
			type Nested<schema> = {
				type: "object"
				properties: { a: { items: schema } }
			}
			attest<
				[true, true, true, true, true, true, true, true, true, true],
				[
					isValid<{ type: any; required: any; properties: any }>,
					isValid<{ $ref: any; minLength: any; multipleOf: any }>,
					isValid<{ enum: any; const: any; exclusiveMinimum: any }>,
					isValid<{ allOf: any; items: any; prefixItems: any }>,
					isValid<{ additionalItems: any; propertyNames: any }>,
					isValid<Nested<{ type: any; required: any; properties: any }>>,
					isValid<Nested<{ $ref: any; minLength: any; multipleOf: any }>>,
					isValid<Nested<{ enum: any; const: any; exclusiveMinimum: any }>>,
					isValid<Nested<{ allOf: any; items: any; prefixItems: any }>>,
					isValid<Nested<{ dependencies: any; components: any; not: any }>>
				]
			>()
		})

		it("object-typed subschema slots", () => {
			attest<
				[true, true, true],
				[
					isValid<{ not: object; items: {}; additionalProperties: object }>,
					isValid<{ properties: { a: object }; $defs: Record<string, {}> }>,
					isValid<{
						type: "object"
						properties: { a: { if: object; then: {}; contains: object } }
					}>
				]
			>()
		})
	})

	describe("hand-written schema types", () => {
		it("mutable tuple", () => {
			attest<
				true,
				isValid<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" }]
					minItems: 1
					items: false
				}>
			>()
		})

		it("mutable composition and ref", () => {
			attest<
				true,
				isValid<{
					$defs: { a: { type: "string" } }
					anyOf: [{ $ref: "#/$defs/a" }, { type: ["null", "number"] }]
				}>
			>()
		})

		it("widened mutable", () => {
			attest<
				true,
				isValid<{
					type: "object"
					properties: Record<string, { type: "string" }>
					required: string[]
				}>
			>()
		})

		it("mutable invalid", () => {
			attest<false, isValid<{ type: "strin" }>>()
			attest<
				false,
				isValid<{ type: "object"; required: ["a"]; properties: {} }>
			>()
			attest<false, isValid<{ type: "string"; minLength: -1 }>>()
			attest<false, isValid<{ $ref: "#/$defs/a" }>>()
		})

		it("optional slots with explicit undefined", () => {
			attest<
				true,
				isValid<{
					type: "object"
					properties?: { a: { type: "string" } } | undefined
					additionalProperties?: { type: "number" } | undefined
					minProperties?: number | undefined
					required?: ["a"] | undefined
					anyOf?: [{ required: ["a"] }] | undefined
				}>
			>()
		})

		it("interface-typed schema records", () => {
			interface Properties {
				a: { type: "string" }
				b: { type: "number" }
			}
			interface Definitions {
				user: { type: "object" }
			}
			interface Dependencies {
				a: readonly ["b"]
			}
			attest<true, isValid<{ type: "object"; properties: Properties }>>()
			attest<
				true,
				isValid<{ type: "object"; properties: Properties; required: ["a"] }>
			>()
			attest<true, isValid<{ $defs: Definitions; $ref: "#/$defs/user" }>>()
			attest<true, isValid<{ definitions: Definitions }>>()
			attest<true, isValid<{ patternProperties: Properties }>>()
			attest<true, isValid<{ dependentSchemas: Properties }>>()
			attest<true, isValid<{ dependencies: Dependencies }>>()
			attest<true, isValid<{ dependentRequired: Dependencies }>>()
		})

		it("recursive hand-written interfaces", () => {
			interface Node {
				type?: JsonSchema.TypeName
				properties?: Record<string, Node>
				items?: Node | readonly Node[]
				anyOf?: Node[]
				required?: string[]
				$ref?: string
				minLength?: number
			}
			attest<true, isValid<Node>>()
			attest<
				true,
				isValid<{ type: "object"; properties: { a: Node }; anyOf: [Node] }>
			>()
		})

		it("an interface with an unknown index signature", () => {
			interface Schema {
				type?: JsonSchema.TypeName
				properties?: Record<string, Schema>
				[k: string]: unknown
			}
			attest<true, isValid<Schema>>()
			attest<true, isValid<{ type: "object"; properties: { a: Schema } }>>()
			interface Extended {
				type: "object"
				properties: { a: { type: "string" } }
				required: ["a"]
				[k: `x-${string}`]: unknown
			}
			attest<true, isValid<Extended>>()
		})

		it("nested unknown subschemas are widened like the root", () => {
			attest<true, isValid<unknown>>()
			attest<true, isValid<{ type: "object"; properties: { a: unknown } }>>()
			attest<true, isValid<{ type: "array"; items: unknown }>>()
			attest<true, isValid<{ allOf: unknown[] }>>()
			attest<
				true,
				isValid<{ type: "object"; properties: Record<string, unknown> }>
			>()
		})

		it("Record<string, unknown> at any depth", () => {
			attest<true, isValid<{ properties: { a: Record<string, unknown> } }>>()
			attest<true, isValid<{ allOf: [Record<string, unknown>] }>>()
			attest<true, isValid<{ items: Record<string, unknown> }>>()
			attest<
				true,
				isValid<{
					$defs: { a: Record<string, unknown> }
					$ref: "#/$defs/a/properties/x/items"
				}>
			>()
			attest<
				true,
				isValid<{
					type: "object"
					properties: { a: Record<string, unknown> }
					required: ["a"]
				}>
			>()
		})

		it("type unions that include every type name", () => {
			// @types/json-schema's JSONSchema4TypeName and JSONSchema6TypeName also include "any"
			type JSONSchema6TypeName =
				| "string"
				| "number"
				| "integer"
				| "boolean"
				| "object"
				| "array"
				| "null"
				| "any"
			interface JSONSchema6 {
				type?: JSONSchema6TypeName | JSONSchema6TypeName[] | undefined
				properties?: { [k: string]: JSONSchema6 | boolean } | undefined
				items?: JSONSchema6 | boolean | (JSONSchema6 | boolean)[] | undefined
				required?: string[] | undefined
			}
			// a union including every type name is widened like `string`
			attest<true, isValid<JSONSchema6>>()
			attest<true, isValid<{ type: JsonSchema.TypeName | "strin" }>>()
			attest<true, isValid<{ type: JsonSchema.TypeName }>>()
			attest<unknown, jsonSchema.infer<{ type: JSONSchema6TypeName }>>()
			// a union missing a type name still checks each member
			attest<false, isValid<{ type: "string" | "number" | "strin" }>>()
		})

		it("JSONSchema4-like types with an any index", () => {
			interface JSONSchema4 {
				[k: string]: any
				type?: string | string[] | undefined
				required?: boolean | string[] | undefined
				properties?: { [k: string]: JSONSchema4 } | undefined
				exclusiveMinimum?: boolean | undefined
				minimum?: number | undefined
			}
			attest<true, isValid<JSONSchema4>>()
			attest<
				true,
				isValid<{ type: "object"; properties: { a: JSONSchema4 } }>
			>()
		})

		it("OpenAPI 3.0 SchemaObject-like types", () => {
			interface ReferenceObject {
				$ref: string
			}
			interface SchemaObject {
				type?: "string" | "number" | "integer" | "boolean" | "object" | "array"
				nullable?: boolean
				format?: string
				items?: ReferenceObject | SchemaObject
				properties?: { [name: string]: ReferenceObject | SchemaObject }
				required?: string[]
				allOf?: (ReferenceObject | SchemaObject)[]
				oneOf?: (ReferenceObject | SchemaObject)[]
				not?: ReferenceObject | SchemaObject
				additionalProperties?: boolean | ReferenceObject | SchemaObject
				maximum?: number
				exclusiveMaximum?: boolean
				minimum?: number
				exclusiveMinimum?: boolean
				enum?: any[]
				discriminator?: { propertyName: string }
				example?: any
				multipleOf?: number
				minLength?: number
			}
			attest<true, isValid<SchemaObject>>()
			attest<true, isValid<ReferenceObject | SchemaObject>>()
			attest<
				true,
				isValid<{
					type: "object"
					properties: { a: SchemaObject; b: ReferenceObject }
				}>
			>()
		})

		it("a JSON module's widened schema type", () => {
			// what `import schema from "./schema.json"` gives: literal keys, widened values
			type Imported = {
				$schema: string
				type: string
				definitions: {
					person: {
						type: string
						properties: { name: { type: string; minLength: number } }
						required: string[]
					}
				}
				properties: {
					name: { type: string; maxLength: number; pattern: string }
					author: {
						oneOf: (
							| { $ref: string; type?: never }
							| { type: string; $ref?: never }
						)[]
					}
					files: { type: string[]; items: { type: string }; minItems: number }
					workspaces: {
						type: string
						items: { type: string }[]
						additionalItems: boolean
					}
					size: {
						type: string
						minimum: number
						exclusiveMaximum: number
						multipleOf: number
					}
				}
				required: string[]
				dependencies: { bin: string[] }
				additionalProperties: boolean
			}
			attest<true, isValid<Imported>>()
			const s = jsonSchema({} as Imported)
			attest<unknown>(s.infer)
		})

		it("refs to an optional definitions container", () => {
			attest<
				true,
				isValid<{ $defs?: { a: { type: "string" } }; $ref: "#/$defs/a" }>
			>()
			attest<
				true,
				isValid<{
					definitions?: { a: { type: "number" } }
					$ref: "#/definitions/a"
				}>
			>()
		})

		it("pointers into widened arrays", () => {
			attest<
				true,
				isValid<{
					$defs: { a: { allOf: { type: "string" }[] } }
					$ref: "#/$defs/a/allOf/0"
				}>
			>()
			attest<
				true,
				isValid<{
					type: "array"
					prefixItems: { type: "string" }[]
					items: { $ref: "#/prefixItems/0" }
				}>
			>()
			// including into a JSONSchema7-typed definition's items
			interface Schema {
				items?: Schema | boolean | (Schema | boolean)[] | undefined
				type?: JsonSchema.TypeName | undefined
			}
			attest<
				true,
				isValid<{ $defs: { a: Schema }; $ref: "#/$defs/a/items/0" }>
			>()
			// and through a widened definition
			attest<
				true,
				isValid<{
					$defs: { a: Record<string, unknown> }
					$ref: "#/$defs/a/properties/x"
				}>
			>()
		})
	})

	describe("union-typed schemas", () => {
		type Valid = { type: "string" }
		type ValidAndMore = { type: "string"; minLength: -1 }

		it("each member of a root union is validated on its own", () => {
			attest<
				true,
				isValid<
					| { type: "object"; properties: { a: true }; required: ["a"] }
					| { type: "object"; properties: { b: true }; required: ["b"] }
				>
			>()
			attest<false, isValid<{ minLength: 1 } | { minLength: -1 }>>()
			attest<
				false,
				isValid<
					| { type: "object"; properties: { a: true }; required: ["b"] }
					| { type: "object"; properties: { b: true }; required: ["b"] }
				>
			>()
		})

		it("each member of a root union is its own root for $ref", () => {
			attest<
				true,
				isValid<
					| { $defs: { a: { type: "string" } }; $ref: "#/$defs/a" }
					| { $defs: { b: { type: "number" } }; $ref: "#/$defs/b" }
				>
			>()
			type Union =
				| { $defs: { a: { type: "string" } }; $ref: "#/$defs/a" }
				| { type: "array"; items: { $ref: "#/$defs/a" } }
			// the second member's ref can't resolve against itself, so it infers unknown items
			attest<string | unknown[], jsonSchema.infer<Union>>()
			attest<false, isValid<Union>>()
		})

		it("an invalid member that is a subtype of a valid one", () => {
			const schema = {} as Valid | ValidAndMore
			attest<false, isValid<Valid | ValidAndMore>>()
			// limitation: TS infers `schema` as { type: "string" } (call-site inference reduces the argument's
			// union to the supertype), so the invalid member is never validated; the inferred type stays sound
			attest(() => jsonSchemaToType(schema)).type.errors.is("")
		})

		it("the error may name a valid member", () => {
			const schema = {} as Valid | { type: "number"; minLength: -1 }
			// accepted: only the invalid member is expected, so TS may report a valid member against it
			attest(() =>
				// @ts-expect-error
				jsonSchemaToType(schema)
			).type.errors(
				`Type 'Valid' is not assignable to type 'validateKeywords<{ type: "number"; minLength: -1; }, { type: "number"; minLength: -1; }, "document">'`
			)
			const withBoolean = {} as true | { minLength: -1 }
			attest(() =>
				// @ts-expect-error
				jsonSchemaToType(withBoolean)
			).type.errors("Type 'true' has no properties in common with type")
		})

		it("a nested union of schemas with refs", () => {
			// accepted: a resolved ref checks as `string`, which accepts an
			// unresolved sibling's ref, and echoing refs would cost every ref
			attest<
				true,
				isValid<{
					type: "object"
					properties: { a: { $ref: "#" } | { $ref: "#/$defs/x" } }
				}>
			>()
		})

		it("union-typed subschema and list values", () => {
			attest<
				false,
				isValid<{ type: "array"; prefixItems: [{}] | [{ type: "strin" }] }>
			>()
			attest<
				false,
				isValid<{ type: "array"; items: [{}] | { type: "strin" } }>
			>()
			attest<
				false,
				isValid<{
					type: "object"
					properties: { a: {} } | { b: { type: "strin" } }
				}>
			>()
			attest<false, isValid<{ properties: { a: true | { type: "strin" } } }>>()
		})

		it("union-typed keyword values", () => {
			attest<true, isValid<{ minLength: 1 | 2 }>>()
			attest<false, isValid<{ minLength: 1 | -1 }>>()
			attest<false, isValid<{ multipleOf: 1 | 0 }>>()
			attest<false, isValid<{ type: "string" | "strin" }>>()
			attest<
				false,
				isValid<{
					type: "object"
					properties: { a: {} }
					required: ["a"] | ["b"]
				}>
			>()
		})
	})

	describe("union-typed subschemas with invalid members", () => {
		// each member is invalid on its own: a negative count, a zero multipleOf
		type NegativeMinLength = { type: "string"; minLength: -1 }
		type ZeroMultipleOf = { type: "number"; multipleOf: 0 }

		it("a root union of invalid members", () => {
			attest<false, isValid<NegativeMinLength>>()
			attest<false, isValid<ZeroMultipleOf>>()
			attest<false, isValid<NegativeMinLength | ZeroMultipleOf>>()
		})

		it("nested invalid members don't validate each other", () => {
			attest<
				false,
				isValid<{
					type: "object"
					properties: { a: NegativeMinLength | ZeroMultipleOf }
				}>
			>()
			attest<false, isValid<{ anyOf: [NegativeMinLength | ZeroMultipleOf] }>>()
			attest<
				false,
				isValid<{
					type: "array"
					items: NegativeMinLength | ZeroMultipleOf
				}>
			>()
		})

		it("a root member whose list or record the other member's completions accept", () => {
			// only the invalid members are expected once one fails
			attest<false, isValid<{ allOf: [] } | { allOf: [{}] }>>()
			attest<false, isValid<{ prefixItems: [] } | { prefixItems: [{}] }>>()
			attest<false, isValid<{ properties: 5 } | { properties: {} }>>()
			const schema = {} as { allOf: [] } | { allOf: [{}] }
			// @ts-expect-error
			attest(() => jsonSchemaToType(schema)).type.errors.snap(
				"Argument of type '{ allOf: []; } | { allOf: [{}]; }' is not assignable to parameter of type 'validateKeywords<{ allOf: []; }, { allOf: []; }, \"document\">'.Type '{ allOf: []; }' is not assignable to type 'validateKeywords<{ allOf: []; }, { allOf: []; }, \"document\">'.Types of property 'allOf' are incompatible.Type '[]' is not assignable to type 'readonly [boolean | object, ...(boolean | object)[]]'.Source has 0 element(s) but target requires 1."
			)
		})

		it("a nested invalid member beside a statically valid one", () => {
			attest<
				false,
				isValid<{
					type: "object"
					properties: { a: NegativeMinLength | { type: "string" } }
				}>
			>()
			attest<
				false,
				isValid<{
					type: "object"
					properties: {
						a: { type: "array"; prefixItems: [] } | { type: "string" }
					}
				}>
			>()
		})

		it("a value of a nested union type", () => {
			const a = {} as NegativeMinLength | ZeroMultipleOf
			attest(() =>
				// @ts-expect-error
				jsonSchemaToType({ type: "object", properties: { a } })
			).type.errors("minLength must be a non-negative integer (was -1)")
		})
	})

	describe("union-typed subschemas checked member by member", () => {
		type Valid = { type: "string"; minLength: 1 }
		type InvalidCount = { type: "string"; minLength: -1 }

		it("an invalid member nested below a valid sibling's keyword", () => {
			// the sibling's valid `not` would accept any subschema as completions
			attest<
				false,
				isValid<{
					type: "object"
					properties: {
						a: { not: { type: "strin" } } | { not: { type: "string" } }
					}
				}>
			>()
			attest<
				false,
				isValid<{
					type: "array"
					items:
						| { not: { type: "strin" } }
						| { not: { type: "string" }; minLength: 1 }
				}>
			>()
		})

		it("an invalid member whose record a valid sibling accepts", () => {
			attest<
				false,
				isValid<{
					type: "object"
					properties: { a: { properties: 5 } | { properties: {} } }
				}>
			>()
			attest<
				false,
				isValid<{
					type: "object"
					properties: {
						a: { properties: { x: { type: "strin" } } } | { properties: {} }
					}
				}>
			>()
		})

		it("an invalid member with a valid sibling's keywords and more", () => {
			attest<
				false,
				isValid<{
					properties: {
						a:
							| { type: "string"; minLength: 1; maxLength: -1 }
							| { type: "string"; minLength: 1 }
					}
				}>
			>()
			attest<
				false,
				isValid<{
					properties: {
						a:
							| { enum: [1]; minLength: 1; multipleOf: 0 }
							| { enum: [1]; minLength: 1 }
					}
				}>
			>()
			attest<
				false,
				isValid<{
					properties: {
						a:
							| { exclusiveMinimum: 0; minLength: 1; maxItems: 1.5 }
							| { exclusiveMinimum: 0; minLength: 1 }
					}
				}>
			>()
		})

		it("a sibling with a keyword the invalid member lacks", () => {
			attest<
				false,
				isValid<{
					properties: {
						a: { minLength: 1; not: { type: "strin" } } | { minLength: 1 }
					}
				}>
			>()
		})

		it("a widened sibling accepts a literal member's invalid count", () => {
			// `number` includes -1, so this is a missing lint
			attest<
				true,
				isValid<{
					properties: { a: { minLength: number } | { minLength: -1 } }
				}>
			>()
		})

		it("a root union whose every member fails the single-pass check", () => {
			type BranchRequired = {
				type: "object"
				properties: {}
				allOf: [{ properties: { b: {} } }]
				required: ["b"]
			}
			attest<true, isValid<BranchRequired>>()
			attest<false, isValid<{ properties: 5 } | BranchRequired>>()
			attest<
				false,
				isValid<{ properties: { x: { type: "strin" } } } | BranchRequired>
			>()
		})

		it("propertyNames members", () => {
			attest<
				false,
				isValid<{
					type: "object"
					propertyNames: { type: "string" } | { type: "number" }
				}>
			>()
			attest<
				true,
				isValid<{
					type: "object"
					propertyNames: { type: "string" } | { maxLength: 3 }
				}>
			>()
			attest<
				false,
				isValid<{
					type: "object"
					propertyNames:
						| { type: "string"; not: { type: "strin" } }
						| { maxLength: 3 }
				}>
			>()
		})

		it("valid members", () => {
			type MinLength = { type: "string"; minLength: 1 }
			type MultipleOf = { type: "number"; multipleOf: 2 }
			attest<
				true,
				isValid<{ type: "object"; properties: { a: MinLength | MultipleOf } }>
			>()
			attest<true, isValid<{ items: MinLength | MinLength[] }>>()
			attest<
				true,
				isValid<{
					properties: { a: { minLength: 1 } | { minLength: 1; maxLength: 2 } }
				}>
			>()
			attest<
				true,
				isValid<{
					properties: {
						a:
							| {
									properties: { x: {} }
									allOf: [{ properties: { y: {} } }]
									required: ["y"]
							  }
							| MinLength
					}
				}>
			>()
			attest<
				true,
				isValid<{ type: "object"; not?: MinLength | MultipleOf | undefined }>
			>()
			const a = {} as MinLength | MultipleOf
			attest(() =>
				jsonSchemaToType({ type: "object", properties: { a } })
			).type.errors.is("")
		})

		it("recursive hand-written unions", () => {
			type Union =
				| { type: "string"; minLength?: number }
				| {
						type: "object"
						properties?: Record<string, Union>
						required?: string[]
				  }
			attest<true, isValid<Union>>()
			attest<true, isValid<{ type: "object"; properties: { a: Union } }>>()
			interface Node {
				type: "object"
				properties: { child: Node | Leaf }
				required?: string[]
			}
			type Leaf = { type: "string"; minLength: 1 }
			attest<true, isValid<Node>>()
			attest<true, isValid<{ items: Node | Leaf }>>()
			interface ListNode {
				anyOf?: (ListNode | Leaf)[]
				minLength?: number
			}
			attest<true, isValid<ListNode>>()
		})

		it("an invalid dependency list beside a valid dependency schema", () => {
			attest(
				{} as isValid<{
					type: "object"
					dependencies: { a: { type: "string" } | ["b", 1] }
				}>
			).type.toString.snap("false")
			attest(
				{} as isValid<{
					type: "object"
					dependencies: { a: { type: "string" } | [{ minLength: -1 }] }
				}>
			).type.toString.snap("false")
		})

		it("valid dependency unions", () => {
			attest<
				true,
				isValid<{
					type: "object"
					dependencies: { a: { type: "string" } | ["b"] }
				}>
			>()
			attest<
				true,
				isValid<{
					type: "object"
					dependencies: { a: { required: ["b"] } | ["b", "c"] }
				}>
			>()
			attest<
				true,
				isValid<{ type: "object"; dependencies: { a: true | ["b"] } }>
			>()
		})

		it("a union of records or lists whose valid member has the invalid member's key or length", () => {
			// limitation (a missing lint on a hand-written union keyword value, inference unaffected):
			// { a: Valid } validates a to KeywordCompletions, which accepts { a: InvalidCount }
			attest(
				{} as isValid<{ properties: { a: Valid } | { a: InvalidCount } }>
			).type.toString.snap("true")
			// limitation: same absorption for lists
			attest(
				{} as isValid<{ allOf: [Valid] | [InvalidCount] }>
			).type.toString.snap("true")
			// a statically valid sibling's completions are closed
			attest<
				false,
				isValid<{ properties: { a: { type: "string" } } | { a: InvalidCount } }>
			>()
		})

		it("an invalid member in every subschema position", () => {
			type U = Valid | InvalidCount
			attest<
				[
					false,
					false,
					false,
					false,
					false,
					false,
					false,
					false,
					false,
					false,
					false,
					false,
					false,
					false,
					false,
					false,
					false,
					false,
					false,
					false
				],
				[
					isValid<{ patternProperties: { a: U } }>,
					isValid<{ $defs: { a: U } }>,
					isValid<{ definitions: { a: U } }>,
					isValid<{ dependentSchemas: { a: U } }>,
					isValid<{ dependencies: { a: U } }>,
					isValid<{ dependencies: { a: U | ["x"] } }>,
					isValid<{ items: U }>,
					isValid<{ items: [U] }>,
					isValid<{ items: U | [Valid] }>,
					isValid<{ prefixItems: [U] }>,
					isValid<{ anyOf: [Valid, U] }>,
					isValid<{ oneOf: U[] }>,
					isValid<{ not: U }>,
					isValid<{ if: U; then: {} }>,
					isValid<{ contains: U }>,
					isValid<{ additionalProperties: U }>,
					isValid<{ additionalItems: U }>,
					isValid<{ propertyNames: U }>,
					isValid<{ components: { schemas: { a: U } } }>,
					isValid<{
						properties: { a: { items: { anyOf: [{ not: U }] } } }
					}>
				]
			>()
		})
	})

	describe("invalid type", () => {
		it("unknown name", () => {
			// @ts-expect-error
			attest(() => inferred({ type: "strin" })).type.errors.snap(
				"Type '\"strin\"' is not assignable to type 'TypeName'. Did you mean '\"string\"'?"
			)
		})

		it("draft-03 any", () => {
			// @ts-expect-error
			attest(() => inferred({ type: "any" })).type.errors(
				`Type '"any"' is not assignable`
			)
		})

		it("wrong kinds", () => {
			// @ts-expect-error
			attest(() => inferred({ type: 5 })).type.errors.snap(
				"Type 'number' is not assignable to type 'TypeName'."
			)
			// @ts-expect-error
			attest(() => inferred({ type: null })).type.errors(
				`Type 'null' is not assignable`
			)
		})

		it("in a list", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					type: ["string", "nul"]
				})
			).type.errors(`Did you mean '"null"'?`)
		})

		it("empty list", () => {
			// the meta-schema requires at least one type name
			attest(() =>
				inferred({
					// @ts-expect-error
					type: []
				})
			).type.errors.snap(
				"Type '[]' is not assignable to type 'readonly [TypeName, ...TypeName[]]'.Source has 0 element(s) but target requires 1."
			)
		})

		it("propertyNames must be strings", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					propertyNames: { type: "number" }
				})
			).type.errors.snap(
				"Type '\"number\"' is not assignable to type '\"string\"'."
			)
		})

		it("propertyNames type list of strings", () => {
			attest(() =>
				inferred({
					type: "object",
					propertyNames: { type: ["string"] }
				})
			).type.errors.is("")
			attest(() =>
				inferred({
					type: "object",
					propertyNames: { type: ["string", "null"] }
				})
			).type.errors.is("")
		})

		it("propertyNames type list without strings", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					propertyNames: { type: ["number", "null"] }
				})
			).type.errors.snap(
				"Type '\"number\"' is not assignable to type '\"string\"'."
			)
		})
	})

	describe("invalid required", () => {
		it("typo", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { name: { type: "string" } },
					// @ts-expect-error
					required: ["nmae"]
				})
			).type.errors.snap(
				"Type '\"nmae\"' is not assignable to type '\"name\"'."
			)
		})

		it("checked against a properties variable", () => {
			const properties = { a: { type: "string" } } as const
			attest(() =>
				inferred({
					type: "object",
					properties,
					// @ts-expect-error
					required: ["a", "b"]
				})
			).type.errors(`Type '"b"' is not assignable to type '"a"'`)
		})

		it("wrong kinds", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					required: "a"
				})
			).type.errors.snap(
				"Type 'string' is not assignable to type 'readonly string[]'."
			)
			attest(() =>
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					// @ts-expect-error
					required: true
				})
			).type.errors(`Type 'boolean' is not assignable`)
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					required: [1]
				})
			).type.errors(`Type 'number' is not assignable to type 'string'`)
		})

		it("draft-03 required on a property", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						// @ts-expect-error
						a: { type: "string", required: true }
					}
				})
			).type.errors("is not assignable")
		})

		it("without properties anything goes", () => {
			attest<{ a: unknown; b: unknown }>(
				inferred({ type: "object", required: ["a", "b"] })
			).type.toString.snap("{ a: unknown; b: unknown }")
		})

		it("duplicate keys are accepted", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					required: ["a", "a"]
				})
			).type.errors.is("")
		})

		it("only the bad properties error, not required", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					properties: 5,
					required: ["a"]
				})
			).type.errors.snap(
				"Type 'number' is not assignable to type '{ readonly [k: string]: boolean | object; }'."
			)
		})

		it("properties of a property aren't declared", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: {
							properties: { b: true },
							// @ts-expect-error
							required: ["a", "b"]
						}
					}
				})
			).type.errors.snap("Type '\"a\"' is not assignable to type '\"b\"'.")
		})

		it("typo in an items schema", () => {
			attest(() =>
				inferred({
					type: "array",
					items: {
						type: "object",
						properties: { a: true },
						// @ts-expect-error
						required: ["b"]
					}
				})
			).type.errors.snap("Type '\"b\"' is not assignable to type '\"a\"'.")
		})

		it("typo under additionalProperties false", () => {
			attest(() =>
				inferred({
					properties: { a: true },
					additionalProperties: false,
					// @ts-expect-error
					required: ["b"]
				})
			).type.errors.snap("Type '\"b\"' is not assignable to type '\"a\"'.")
		})

		it("typos in hand-written required entries", () => {
			attest<
				false,
				isValid<{
					type: "object"
					properties: Record<"a" | "b", { type: "string" }>
					required: ["c"]
				}>
			>()
			attest<
				true,
				isValid<{ properties: { [k: `x-${string}`]: {} }; required: ["x-a"] }>
			>()
			attest<
				false,
				isValid<{ properties: { [k: `x-${string}`]: {} }; required: ["y"] }>
			>()
			// an optional `additionalProperties?: false` is still self-contained
			attest<
				false,
				isValid<{
					type: "object"
					properties: { a: {} }
					required: ["b"]
					additionalProperties?: false
				}>
			>()
			// a widened additionalProperties may be true
			attest<
				true,
				isValid<{
					type: "object"
					properties: { a: {} }
					required: ["b"]
					additionalProperties: boolean
				}>
			>()
		})

		it("a template-literal entry beside literal properties", () => {
			// like a union entry ("a" | "b" beside { a }), an entry type that can name an undeclared key is a typo
			attest(
				{} as isValid<{
					type: "object"
					properties: { "x-a": {} }
					required: [`x-${string}`]
				}>
			).type.toString.snap("false")
		})

		it("union, template and widened entries", () => {
			attest<
				[true, false, true, true, true, true],
				[
					isValid<{
						type: "object"
						properties: { a: {}; b: {} }
						required: ["a" | "b"]
					}>,
					isValid<{
						type: "object"
						properties: { a: {} }
						required: ["a" | "b"]
					}>,
					isValid<{
						type: "object"
						properties: Record<`x-${string}`, {}>
						required: [`x-${string}`]
					}>,
					isValid<{
						type: "object"
						properties: Record<`x-${string}`, {}>
						required: ["x-a"]
					}>,
					isValid<{
						type: "object"
						properties: Record<string, {}>
						required: ["anything"]
					}>,
					isValid<{
						type: "object"
						properties: { a: {} }
						required: string[]
					}>
				]
			>()
		})

		it("a typo in a spread of a jsonSchema value", () => {
			const base = jsonSchema({
				type: "object",
				properties: { name: { type: "string" } }
			})
			// @ts-expect-error
			attest(() => jsonSchema({ ...base, required: ["nmae"] })).type.errors(
				`Type '"nmae"' is not assignable to type '"name"'`
			)
		})

		it("required key matched by patternProperties infers the index value", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } }
				patternProperties: { "^x-": { type: "number" } }
				additionalProperties: false
				required: ["a", "x-id"]
			}>
			attest<{ [k: string]: string | number; a: string; "x-id": number }, T>()
		})

		it("required key covered by additionalProperties infers the index value", () => {
			type T = jsonSchema.infer<{
				type: "object"
				additionalProperties: { type: "string" }
				required: ["a"]
			}>
			attest<{ [k: string]: string; a: string }, T>()
		})
	})

	describe("required keys outside properties", () => {
		// a required key outside properties is a typo only in a self-contained node on an isolated path from the root
		type Typo = { properties: { a: {} }; required: ["b"] }

		it("required in a definition is only checked to be strings", () => {
			// a definition may be combined with schemas declaring other keys
			const T = inferred({
				$defs: {
					user: {
						type: "object",
						properties: { name: { type: "string" } },
						required: ["nam"]
					}
				},
				$ref: "#/$defs/user"
			})
			attest<{ name?: string; nam: unknown }>(T).type.toString.snap(
				"{ name?: string; nam: unknown }"
			)
		})

		it("required in a branch may name keys no schema declares", () => {
			const T = inferred({
				type: "object",
				properties: { kind: { type: "string" }, a: { type: "number" } },
				oneOf: [
					{ properties: { kind: { const: "a" } }, required: ["kind", "b"] }
				]
			})
			attest<{ kind: "a"; a?: number; b: unknown }>(T).type.toString.snap(
				'{ kind: "a"; a?: number; b: unknown }'
			)
		})

		it("required in a branch must still be strings", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { kind: true },
					// @ts-expect-error
					oneOf: [{ properties: { alpha: true }, required: [1] }]
				})
			).type.errors("Type 'number' is not assignable to type 'string'")
		})

		it("each exempting keyword", () => {
			attest<
				true,
				isValid<{ properties: { a: {} }; required: ["b"]; allOf: [{}] }>
			>()
			attest<
				true,
				isValid<{ properties: { a: {} }; required: ["b"]; anyOf: [{}] }>
			>()
			attest<
				true,
				isValid<{ properties: { a: {} }; required: ["b"]; oneOf: [{}] }>
			>()
			attest<
				true,
				isValid<{ properties: { a: {} }; required: ["b"]; if: {} }>
			>()
			attest<
				true,
				isValid<{ properties: { a: {} }; required: ["b"]; then: {} }>
			>()
			attest<
				true,
				isValid<{ properties: { a: {} }; required: ["b"]; else: {} }>
			>()
			attest<
				true,
				isValid<{
					properties: { a: {} }
					required: ["b"]
					dependentSchemas: {}
				}>
			>()
			attest<
				true,
				isValid<{ properties: { a: {} }; required: ["b"]; dependencies: {} }>
			>()
			attest<
				true,
				isValid<{ properties: { a: {} }; required: ["b"]; $ref: "#" }>
			>()
			attest<
				true,
				isValid<{
					properties: { a: {} }
					required: ["b"]
					patternProperties: {}
				}>
			>()
			attest<
				true,
				isValid<{
					properties: { a: {} }
					required: ["b"]
					additionalProperties: true
				}>
			>()
			attest<
				true,
				isValid<{
					properties: { a: {} }
					required: ["b"]
					additionalProperties: { type: "string" }
				}>
			>()
		})

		it("each exempt position", () => {
			attest<true, isValid<{ allOf: [Typo] }>>()
			attest<true, isValid<{ anyOf: [Typo] }>>()
			attest<true, isValid<{ oneOf: [Typo] }>>()
			attest<true, isValid<{ if: Typo }>>()
			attest<true, isValid<{ if: {}; then: Typo }>>()
			attest<true, isValid<{ if: {}; else: Typo }>>()
			attest<true, isValid<{ not: Typo }>>()
			attest<true, isValid<{ dependentSchemas: { a: Typo } }>>()
			attest<true, isValid<{ dependencies: { a: Typo } }>>()
			attest<true, isValid<{ $defs: { a: Typo } }>>()
			attest<true, isValid<{ definitions: { a: Typo } }>>()
			attest<
				true,
				isValid<{ openapi: "3.1.0"; components: { schemas: { a: Typo } } }>
			>()
			// only properties, items, prefixItems and additionalProperties
			// links from the root are checked
			attest<true, isValid<{ items: [Typo] }>>()
			attest<true, isValid<{ contains: Typo }>>()
			attest<true, isValid<{ patternProperties: { "^a": Typo } }>>()
			attest<true, isValid<{ items: [{}]; additionalItems: Typo }>>()
			attest<true, isValid<{ contentSchema: Typo }>>()
			attest<true, isValid<{ propertyNames: Typo }>>()
		})

		it("each position below an exempt node", () => {
			attest<true, isValid<{ $defs: { d: { properties: { x: Typo } } } }>>()
			attest<true, isValid<{ allOf: [{ items: Typo }] }>>()
			attest<
				true,
				isValid<{ allOf: [{ properties: { a: { items: Typo } } }] }>
			>()
			attest<true, isValid<{ not: { properties: { x: Typo } } }>>()
			attest<
				true,
				isValid<{
					$ref: "#/$defs/d"
					$defs: { d: {} }
					properties: { x: Typo }
				}>
			>()
			attest<
				true,
				isValid<{ properties: { x: Typo }; patternProperties: { "^x": {} } }>
			>()
			attest<true, isValid<{ properties: { x: Typo }; anyOf: [{}] }>>()
			attest<
				true,
				isValid<{ properties: { x: { properties: { y: Typo } } }; if: {} }>
			>()
			attest<true, isValid<{ items: Typo; contains: {} }>>()
			attest<true, isValid<{ prefixItems: [Typo]; contains: {} }>>()
		})

		it("each checked position", () => {
			attest<false, isValid<{ properties: { x: Typo } }>>()
			attest<false, isValid<{ items: Typo }>>()
			attest<false, isValid<{ prefixItems: [Typo] }>>()
			attest<false, isValid<{ additionalProperties: Typo }>>()
			attest<false, isValid<Typo | { type: "string" }>>()
			attest<
				false,
				isValid<{
					properties: {
						a: { items: { prefixItems: [{ properties: { x: Typo } }] } }
					}
				}>
			>()
			// another schema applies only to keys or elements a link doesn't reach
			attest<
				false,
				isValid<{ properties: { x: Typo }; additionalProperties: {} }>
			>()
			attest<
				false,
				isValid<{ properties: { x: {} }; additionalProperties: Typo }>
			>()
			attest<false, isValid<{ prefixItems: [{}]; items: Typo }>>()
			attest<false, isValid<{ properties: { x: Typo }; propertyNames: {} }>>()
			attest<false, isValid<{ properties: { x: Typo }; $defs: { d: {} } }>>()
			attest<
				false,
				isValid<{ properties: { a: {} }; required: ["b"]; not: {} }>
			>()
			attest<
				false,
				isValid<{
					$schema: "x"
					$id: "https://example.com"
					title: "t"
					properties: { a: {} }
					required: ["b"]
				}>
			>()
			attest<
				false,
				isValid<{
					type: ["object", "null"]
					properties: { a: {} }
					required: ["b"]
				}>
			>()
			attest<
				false,
				isValid<{
					type: "object"
					nullable: true
					properties: { a: {} }
					required: ["b"]
				}>
			>()
		})
	})

	describe("invalid $ref", () => {
		it("missing definition", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					// @ts-expect-error
					$ref: "#/$defs/b"
				})
			).type.errors.snap(
				'Type \'"#/$defs/b"\' is not assignable to type \'"#" | "#/$defs/a"\'. Did you mean \'"#/$defs/a"\'?'
			)
		})

		it("did you mean for a misspelled definitions container", () => {
			attest(() =>
				inferred({
					$defs: { user: {} },
					// @ts-expect-error
					$ref: "#/defs/user"
				})
			).type.errors(`Did you mean '"#/$defs/user"'?`)
		})

		it("no definitions at all", () => {
			// @ts-expect-error
			attest(() => inferred({ $ref: "#/$defs/a" })).type.errors.snap(
				"Type '\"#/$defs/a\"' is not assignable to type '\"#\"'."
			)
		})

		it("bad pointer", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: { type: "string" },
						// @ts-expect-error
						b: { $ref: "#/properties/c" }
					}
				})
			).type.errors(`'"#/properties/c"' is not assignable`)
		})

		it("pointer past a leaf", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					// @ts-expect-error
					$ref: "#/$defs/a/type/x"
				})
			).type.errors("is not assignable")
		})

		it("unescaped slash in a definition name", () => {
			// "#/$defs/a/b" points at $defs.a.b, not $defs["a/b"] (that is "#/$defs/a~1b")
			attest(() =>
				inferred({
					$defs: { "a/b": { type: "string" } },
					// @ts-expect-error
					$ref: "#/$defs/a/b"
				})
			).type.errors.snap(
				'Type \'"#/$defs/a/b"\' is not assignable to type \'"#" | "#/$defs/a~1b"\'. Did you mean \'"#/$defs/a~1b"\'?'
			)
		})

		it("ref errors list escaped and numeric names", () => {
			attest(() =>
				inferred({
					$defs: { a: {}, "x/y": {}, "m~n": {}, 0: {} },
					// @ts-expect-error
					$ref: "#/$defs/zz"
				})
			).type.errors.snap(
				'Type \'"#/$defs/zz"\' is not assignable to type \'"#" | "#/$defs/0" | "#/$defs/a" | "#/$defs/m~0n" | "#/$defs/x~1y"\'. Did you mean \'"#/$defs/0"\'?'
			)
		})

		it("pointer array indices follow RFC 6901", () => {
			attest<
				true,
				isValid<{ $defs: { a: { allOf: [{}] } }; $ref: "#/$defs/a/allOf/0" }>
			>()
			attest<
				false,
				isValid<{ $defs: { a: { allOf: [{}] } }; $ref: "#/$defs/a/allOf/1" }>
			>()
			attest<
				false,
				isValid<{
					$defs: { a: { allOf: [{}, {}] } }
					$ref: "#/$defs/a/allOf/01"
				}>
			>()
			attest<
				false,
				isValid<{ $defs: { a: { allOf: [{}] } }; $ref: "#/$defs/a/allOf/-" }>
			>()
			attest<false, isValid<{ $ref: "#/required/0"; required: ["a"] }>>()
		})

		it("wrong kind", () => {
			// @ts-expect-error
			attest(() => inferred({ $ref: 5 })).type.errors(
				`Type 'number' is not assignable to type 'string'`
			)
		})

		it("OpenAPI component refs need the document as root", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						// @ts-expect-error
						category: { $ref: "#/components/schemas/Category" }
					}
				})
			).type.errors("is not assignable")
		})

		it("nested missing definition", () => {
			attest(() =>
				inferred({
					$defs: {
						a: { type: "string" },
						// @ts-expect-error
						b: { type: "array", items: { $ref: "#/$defs/c" } }
					},
					$ref: "#/$defs/b"
				})
			).type.errors.snap(
				'Type \'"#/$defs/c"\' is not assignable to type \'"#" | "#/$defs/a" | "#/$defs/b" | undefined\'. Did you mean \'"#/$defs/a"\'?'
			)
		})

		it("local ref inside an embedded resource without $id resolves against the root", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: {
							$defs: { x: { type: "string" } },
							// @ts-expect-error
							$ref: "#/$defs/x"
						}
					}
				})
			).type.errors(`'"#/$defs/x"' is not assignable`)
		})

		it("local ref inside an embedded resource with $id", () => {
			// "#" is relative to the nearest $id (2020-12 §8.2.1), as in bundled schemas
			attest(() =>
				inferred({
					$defs: {
						address: {
							$id: "https://example.com/address",
							$defs: { street: { type: "string" } },
							type: "object",
							properties: { street: { $ref: "#/$defs/street" } }
						}
					},
					$ref: "#/$defs/address"
				})
			).type.errors.is("")
		})

		it("root definition from inside an embedded resource", () => {
			attest(() =>
				inferred({
					$defs: {
						name: { type: "string" },
						address: {
							$id: "https://example.com/address",
							$defs: { street: { type: "string" } },
							type: "object",
							// @ts-expect-error
							properties: { name: { $ref: "#/$defs/name" } }
						}
					},
					$ref: "#/$defs/address"
				})
			).type.errors.snap(
				'Type \'"#/$defs/name"\' is not assignable to type \'"#" | "#/$defs/street"\'.'
			)
		})

		it("$ref beside an embedded $id", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: {
							$id: "https://example.com/a",
							$defs: { s: { type: "string" } },
							$ref: "#/$defs/s"
						}
					}
				})
			).type.errors.is("")
		})

		it("a fragment $id resolves against the root", () => {
			attest(() =>
				inferred({
					$defs: { s: { type: "string" } },
					type: "object",
					properties: {
						a: {
							$id: "#a",
							type: "object",
							properties: { b: { $ref: "#/$defs/s" } }
						}
					}
				})
			).type.errors.is("")
		})

		it("any local ref inside a widened $id", () => {
			attest<
				true,
				isValid<{
					type: "object"
					properties: {
						p: {
							$id: string
							type: "object"
							properties: { q: { $ref: "#/$defs/a" } }
						}
					}
				}>
			>()
		})

		it("an optional $id resolves against the root", () => {
			attest<
				true,
				isValid<{
					$defs: { a: { type: "string" } }
					type: "object"
					properties: {
						p: {
							$id?: string
							type: "object"
							properties: { q: { $ref: "#/$defs/a" } }
						}
					}
				}>
			>()
		})
	})

	describe("dialects", () => {
		type Draft04 = "http://json-schema.org/draft-04/schema#"
		type Draft07 = "http://json-schema.org/draft-07/schema#"
		type Inner<ref extends string> = {
			type: "object"
			properties: { y: { $ref: ref } }
		}

		it("which identifier starts a resource", () => {
			attest<
				[false, true, false, true, true, true, true],
				[
					// 2020-12: $id is a resource, so #/$defs is its own
					isValid<{
						$defs: { a: {} }
						type: "object"
						properties: { x: { $id: "x.json" } & Inner<"#/$defs/a"> }
					}>,
					// 2020-12: id is an unknown keyword
					isValid<{
						$defs: { a: {} }
						type: "object"
						properties: { x: { id: "x.json" } & Inner<"#/$defs/a"> }
					}>,
					isValid<{
						$schema: Draft04
						definitions: { a: {} }
						type: "object"
						properties: { x: { id: "x.json" } & Inner<"#/definitions/a"> }
					}>,
					// draft-04: $id is an unknown keyword
					isValid<{
						$schema: Draft04
						definitions: { a: {} }
						type: "object"
						properties: { x: { $id: "x.json" } & Inner<"#/definitions/a"> }
					}>,
					// draft-07: id is an unknown keyword
					isValid<{
						$schema: Draft07
						definitions: { a: {} }
						type: "object"
						properties: { x: { id: "x.json" } & Inner<"#/definitions/a"> }
					}>,
					// an optional or widened $schema may be any draft: lenient
					isValid<{
						$schema?: Draft04
						definitions: { a: {} }
						type: "object"
						properties: { x: { id: "x.json" } & Inner<"#/definitions/a"> }
					}>,
					isValid<{
						$schema: string
						definitions: { a: {} }
						type: "object"
						properties: { x: { $id: "x.json" } & Inner<"#/definitions/a"> }
					}>
				]
			>()
		})

		it("an identifier beside $ref", () => {
			attest<
				[false, true, true],
				[
					isValid<{
						$defs: { a: {} }
						type: "object"
						properties: { x: { $id: "x.json"; $ref: "#/$defs/a" } }
					}>,
					// ignored with the rest of the $ref's siblings
					isValid<{
						$schema: Draft07
						definitions: { a: {} }
						type: "object"
						properties: { x: { $id: "x.json"; $ref: "#/definitions/a" } }
					}>,
					isValid<{
						$schema: Draft04
						definitions: { a: {} }
						type: "object"
						properties: { x: { id: "x.json"; $ref: "#/definitions/a" } }
					}>
				]
			>()
		})

		it("a nested draft-04 resource", () => {
			attest<
				[false, true],
				[
					isValid<{
						$schema: Draft04
						type: "object"
						properties: {
							x: {
								id: "x.json"
								definitions: { a: {} }
								type: "object"
								properties: {
									y: { id: "y.json" } & Inner<"#/definitions/a">
								}
							}
						}
					}>,
					isValid<{
						$schema: Draft04
						type: "object"
						properties: {
							x: {
								id: "x.json"
								definitions: { a: {} }
							} & Inner<"#/definitions/a">
						}
					}>
				]
			>()
		})

		it("$ref siblings ignored by draft-07 are still validated", () => {
			attest(() =>
				inferred({
					$schema: "http://json-schema.org/draft-07/schema#",
					definitions: { a: {} },
					$ref: "#/definitions/a",
					// @ts-expect-error
					minLength: -1
				})
			).type.errors("minLength must be a non-negative integer (was -1)")
		})
	})

	describe("counts", () => {
		it("all counts at once", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					minLength: -1,
					// @ts-expect-error
					maxLength: -2,
					// @ts-expect-error
					minItems: -3,
					// @ts-expect-error
					maxItems: -4,
					// @ts-expect-error
					minProperties: -5,
					// @ts-expect-error
					maxProperties: -6,
					// @ts-expect-error
					minContains: -7,
					// @ts-expect-error
					maxContains: -8
				})
			).type.errors
				.snap(`Type 'number' is not assignable to type '"minLength must be a non-negative integer (was -1)\u200b"'.
Type 'number' is not assignable to type '"maxLength must be a non-negative integer (was -2)\u200b"'.
Type 'number' is not assignable to type '"minItems must be a non-negative integer (was -3)\u200b"'.
Type 'number' is not assignable to type '"maxItems must be a non-negative integer (was -4)\u200b"'.
Type 'number' is not assignable to type '"minProperties must be a non-negative integer (was -5)\u200b"'.
Type 'number' is not assignable to type '"maxProperties must be a non-negative integer (was -6)\u200b"'.
Type 'number' is not assignable to type '"minContains must be a non-negative integer (was -7)\u200b"'.
Type 'number' is not assignable to type '"maxContains must be a non-negative integer (was -8)\u200b"'.`)
		})

		it("boundary counts", () => {
			attest(() =>
				inferred({
					type: "string",
					minLength: 0,
					// prettier-ignore
					maxLength: 1.0
				})
			).type.errors.is("")
			attest(() =>
				inferred({
					type: "array",
					minItems: 1e3,
					maxItems: 9007199254740991
				})
			).type.errors.is("")
		})

		it("negative zero count", () => {
			attest(() => inferred({ type: "string", minLength: -0 })).type.errors.is(
				""
			)
		})

		it("a fractional count", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "string", maxLength: 2.5 })
			).type.errors("maxLength must be a non-negative integer (was 2.5)")
		})

		it("a fraction in exponent notation", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "string", minLength: 1e-7 })
			).type.errors("minLength must be a non-negative integer (was 1e-7)")
		})

		it("exponent notation integers", () => {
			attest(() =>
				inferred({ type: "string", minLength: 1e21, maxLength: 1.5e21 })
			).type.errors.is("")
			attest(() =>
				// @ts-expect-error
				inferred({ type: "array", maxItems: -1e21 })
			).type.errors.snap(
				"Type 'number' is not assignable to type '\"maxItems must be a non-negative integer (was -1e+21)\u200b\"'."
			)
		})

		it("infinite counts", () => {
			attest(
				() =>
					// @ts-expect-error
					inferred({ type: "string", maxLength: 1e999 }) // eslint-disable-line no-loss-of-precision
			).type.errors.snap(
				"Type 'number' is not assignable to type '\"maxLength must be a non-negative integer (was Infinity)\u200b\"'."
			)
		})

		it("wrong kinds", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "string", minLength: "3" })
			).type.errors(`Type 'string' is not assignable to type 'number'`)
			attest(() =>
				// @ts-expect-error
				inferred({ type: "array", maxItems: null })
			).type.errors(`Type 'null' is not assignable to type 'number'`)
			attest(() =>
				// @ts-expect-error
				inferred({ type: "object", minProperties: true })
			).type.errors(`is not assignable to type 'number'`)
		})
	})

	describe("invalid keyword value kinds", () => {
		it("numbers", () => {
			// @ts-expect-error
			attest(() => inferred({ type: "number", minimum: "1" })).type.errors(
				`Type 'string' is not assignable to type 'number'`
			)
			// @ts-expect-error
			attest(() => inferred({ type: "number", maximum: null })).type.errors(
				`Type 'null' is not assignable to type 'number'`
			)
			// @ts-expect-error
			attest(() => inferred({ type: "number", multipleOf: "2" })).type.errors(
				`Type 'string' is not assignable to type 'number'`
			)
			attest(() =>
				// @ts-expect-error
				inferred({ type: "number", exclusiveMaximum: "5" })
			).type.errors.snap("Type 'string' is not assignable to type 'number'.")
			attest(() =>
				// @ts-expect-error
				inferred({ type: "number", exclusiveMinimum: [0] })
			).type.errors.snap("Type 'number[]' is not assignable to type 'number'.")
		})

		it("fractional and widened multipleOf", () => {
			const n: number = 2
			attest(() =>
				inferred({ type: "number", multipleOf: 0.01, maximum: 1 })
			).type.errors.is("")
			attest(() => inferred({ type: "number", multipleOf: n })).type.errors.is(
				""
			)
		})

		it("multipleOf must be positive", () => {
			// "The value of multipleOf MUST be a number, strictly greater than 0."
			attest(() =>
				// @ts-expect-error
				inferred({ type: "number", multipleOf: 0 })
			).type.errors.snap(
				"Type 'number' is not assignable to type '\"multipleOf must be a positive number (was 0)\u200b\"'."
			)
			attest(() =>
				// @ts-expect-error
				inferred({ type: "number", multipleOf: -2 })
			).type.errors.snap(
				"Type 'number' is not assignable to type '\"multipleOf must be a positive number (was -2)\u200b\"'."
			)
		})

		it("strings", () => {
			// @ts-expect-error
			attest(() => inferred({ type: "string", pattern: 5 })).type.errors(
				`Type 'number' is not assignable to type 'string | RegExp'`
			)
			// @ts-expect-error
			attest(() => inferred({ type: "string", format: true })).type.errors(
				`Type 'boolean' is not assignable to type 'string'`
			)
		})

		it("RegExp pattern", () => {
			// not JSON, but jsonSchemaToType reads it with its flags
			attest(inferred({ type: "string", pattern: /^a/ })).type.toString.snap(
				"string"
			)
		})

		it("booleans", () => {
			// @ts-expect-error
			attest(() => inferred({ type: "array", uniqueItems: 1 })).type.errors(
				`Type 'number' is not assignable to type 'boolean'`
			)
			// @ts-expect-error
			attest(() => inferred({ type: "string", nullable: "true" })).type.errors(
				`Type 'string' is not assignable to type 'boolean'`
			)
		})

		it("enum", () => {
			// @ts-expect-error
			attest(() => inferred({ enum: "a" })).type.errors.snap(
				"Type 'string' is not assignable to type 'readonly unknown[]'."
			)
			// @ts-expect-error
			attest(() => inferred({ enum: { a: 1 } })).type.errors(
				"'a' does not exist in type 'readonly unknown[]'"
			)
		})

		it("schema records", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					properties: 5
				})
			).type.errors.snap(
				"Type 'number' is not assignable to type '{ readonly [k: string]: boolean | object; }'."
			)
			attest(() =>
				inferred({
					// @ts-expect-error
					$defs: "a"
				})
			).type.errors("is not assignable")
			attest(() =>
				inferred({
					// @ts-expect-error
					definitions: null
				})
			).type.errors("is not assignable")
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					dependentSchemas: 1
				})
			).type.errors("is not assignable")
		})

		it("schema records given as arrays", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					patternProperties: [{ type: "string" }]
				})
			).type.errors.snap(
				"Type '{ type: string; }[]' is not assignable to type '{ readonly [k: string]: boolean | object; }'.Index signature for type 'string' is missing in type '{ type: string; }[]'."
			)
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					properties: [{ type: "string" }]
				})
			).type.errors.snap(
				"Type '{ type: string; }[]' is not assignable to type '{ readonly [k: string]: boolean | object; }'.Index signature for type 'string' is missing in type '{ type: string; }[]'."
			)
		})

		it("schema lists", () => {
			// @ts-expect-error
			attest(() => inferred({ allOf: { type: "string" } })).type.errors.snap(
				"Object literal may only specify known properties, and 'type' does not exist in type 'readonly (boolean | object)[]'."
			)
			// @ts-expect-error
			attest(() => inferred({ anyOf: "string" })).type.errors(
				"is not assignable"
			)
			// @ts-expect-error
			attest(() => inferred({ oneOf: 1 })).type.errors("is not assignable")
			attest(() =>
				inferred({
					type: "array",
					// @ts-expect-error
					prefixItems: { type: "string" }
				})
			).type.errors("'type' does not exist in type")
		})

		it("empty schema lists", () => {
			// the meta-schema requires at least one subschema
			// @ts-expect-error
			attest(() => inferred({ allOf: [] })).type.errors.snap(
				"Type '[]' is not assignable to type 'readonly [boolean | object, ...(boolean | object)[]]'.Source has 0 element(s) but target requires 1."
			)
			// @ts-expect-error
			attest(() => inferred({ anyOf: [] })).type.errors.snap(
				"Type '[]' is not assignable to type 'readonly [boolean | object, ...(boolean | object)[]]'.Source has 0 element(s) but target requires 1."
			)
			// @ts-expect-error
			attest(() => inferred({ oneOf: [] })).type.errors.snap(
				"Type '[]' is not assignable to type 'readonly [boolean | object, ...(boolean | object)[]]'.Source has 0 element(s) but target requires 1."
			)
		})

		it("union schema lists with an empty member", () => {
			attest(
				{} as isValid<{ allOf: [] | [{ type: "string" }] }>
			).type.toString.snap("false")
			attest(
				{} as isValid<{ anyOf: [] | [{ type: "string" }] }>
			).type.toString.snap("false")
			attest(
				{} as isValid<{ oneOf: [] | [{ type: "string" }] }>
			).type.toString.snap("false")
		})
	})

	describe("invalid subschemas", () => {
		it("root", () => {
			// @ts-expect-error
			attest(() => inferred("string")).type.errors(
				"JSON Schema must be an object or a boolean (was string)"
			)
			// @ts-expect-error
			attest(() => inferred(5)).type.errors(
				"JSON Schema must be an object or a boolean (was number)"
			)
			// @ts-expect-error
			attest(() => inferred(null)).type.errors(
				"JSON Schema must be an object or a boolean (was null)"
			)
			// @ts-expect-error
			attest(() => inferred(undefined)).type.errors(
				"JSON Schema must be an object or a boolean (was undefined)"
			)
			// @ts-expect-error
			attest(() => inferred([{ type: "string" }])).type.errors(
				"JSON Schema must be an object or a boolean (was array)"
			)
		})

		it("root via jsonSchemaToType", () => {
			// @ts-expect-error
			attest(() => jsonSchemaToType("string")).type.errors.snap(
				"Argument of type '\"string\"' is not assignable to parameter of type '\"JSON Schema must be an object or a boolean (was string)\u200b\"'."
			)
		})

		it("property", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: { type: "string" },
						// @ts-expect-error
						b: "number"
					}
				})
			).type.errors.snap(
				"Type '\"number\"' is not assignable to type '\"JSON Schema must be an object or a boolean (was string)\u200b\"'."
			)
		})

		it("every schema keyword", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					not: "a",
					// @ts-expect-error
					if: 1,
					// @ts-expect-error
					then: null,
					// @ts-expect-error
					else: [true],
					// @ts-expect-error
					contains: "x",
					// @ts-expect-error
					additionalProperties: "string",
					// @ts-expect-error
					propertyNames: 1,
					// @ts-expect-error
					items: "string"
				})
			).type.errors
				.snap(`Type '"a"' is not assignable to type '"JSON Schema must be an object or a boolean (was string)\u200b"'.
Type 'number' is not assignable to type '"JSON Schema must be an object or a boolean (was number)\u200b"'.
Type 'null' is not assignable to type '"JSON Schema must be an object or a boolean (was null)\u200b"'.
Type 'true[]' is not assignable to type '"JSON Schema must be an object or a boolean (was array)\u200b"'.
Type '"x"' is not assignable to type '"JSON Schema must be an object or a boolean (was string)\u200b"'.
Type '"string"' is not assignable to type '"JSON Schema must be an object or a boolean (was string)\u200b"'.
Type 'number' is not assignable to type '"JSON Schema must be an object or a boolean (was number)\u200b"'.
Type '"string"' is not assignable to type '"JSON Schema must be an object or a boolean (was string)\u200b"'.`)
		})

		it("every schema list keyword element", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					allOf: [true, "a"],
					// @ts-expect-error
					anyOf: [{}, 1],
					// @ts-expect-error
					oneOf: [null],
					// @ts-expect-error
					prefixItems: [{ type: "string" }, "number"]
				})
			).type.errors
				.snap(`Type '"a"' is not assignable to type '"JSON Schema must be an object or a boolean (was string)\u200b"'.
Type 'number' is not assignable to type '"JSON Schema must be an object or a boolean (was number)\u200b"'.
Type 'null' is not assignable to type '"JSON Schema must be an object or a boolean (was null)\u200b"'.
Type '"number"' is not assignable to type '"JSON Schema must be an object or a boolean (was string)\u200b"'.`)
		})

		it("draft-07 items list element", () => {
			attest(() =>
				inferred({
					type: "array",
					// @ts-expect-error
					items: [{ type: "string" }, "number"]
				})
			).type.errors("JSON Schema must be an object or a boolean (was string)")
		})

		it("every schema record keyword value", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					properties: { a: 1 },
					// @ts-expect-error
					patternProperties: { "^a": "string" },
					// @ts-expect-error
					$defs: { a: null },
					// @ts-expect-error
					definitions: { a: [] },
					// @ts-expect-error
					dependentSchemas: { a: "b" }
				})
			).type.errors
				.snap(`Type 'number' is not assignable to type '"JSON Schema must be an object or a boolean (was number)\u200b"'.
Type '"string"' is not assignable to type '"JSON Schema must be an object or a boolean (was string)\u200b"'.
Type 'null' is not assignable to type '"JSON Schema must be an object or a boolean (was null)\u200b"'.
Type 'never[]' is not assignable to type '"JSON Schema must be an object or a boolean (was array)\u200b"'.
Type '"b"' is not assignable to type '"JSON Schema must be an object or a boolean (was string)\u200b"'.`)
		})

		it("additionalItems", () => {
			attest(() =>
				inferred({
					type: "array",
					items: [{ type: "string" }],
					// @ts-expect-error
					additionalItems: "number"
				})
			).type.errors("JSON Schema must be an object or a boolean (was string)")
		})

		it("draft-07 dependencies schema", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					dependencies: { a: { type: "strin" } }
				})
			).type.errors.snap(
				"Type '\"strin\"' is not assignable to type 'TypeName'. Did you mean '\"string\"'?"
			)
		})

		it("a draft-07 dependencies value that is a string", () => {
			// @ts-expect-error
			attest(() => inferred({ dependencies: { a: "b" } })).type.errors(
				"JSON Schema must be an object or a boolean (was string)"
			)
		})

		it("contentSchema", () => {
			attest(() =>
				inferred({
					type: "string",
					contentMediaType: "application/json",
					// @ts-expect-error
					contentSchema: { type: "strin" }
				})
			).type.errors.snap(
				"Type '\"strin\"' is not assignable to type 'TypeName | undefined'. Did you mean '\"string\"'?"
			)
		})
	})

	describe("keyword combinations the runtime reads", () => {
		it("const and enum", () => {
			attest(inferred({ const: "a", enum: ["a", "b"] })).type.toString.snap(
				'"a"'
			)
		})

		it("bounds and exclusive bounds", () => {
			attest(
				inferred({ type: "number", minimum: 0, exclusiveMinimum: 0 })
			).type.toString.snap("number")
			attest(
				inferred({ type: "number", maximum: 5, exclusiveMaximum: 5 })
			).type.toString.snap("number")
		})

		it("OpenAPI 3.0 boolean exclusive bounds", () => {
			attest(() =>
				inferred({
					type: "number",
					minimum: 0,
					// @ts-expect-error
					exclusiveMinimum: true,
					maximum: 10,
					// @ts-expect-error
					exclusiveMaximum: false
				})
			).type.errors
				.snap(`Type 'true' is not assignable to type '"boolean exclusiveMinimum isn't supported by jsonSchemaToType\u200b"'.
Type 'false' is not assignable to type '"boolean exclusiveMaximum isn't supported by jsonSchemaToType\u200b"'.`)
		})

		it("non-array items and additionalItems", () => {
			attest(
				inferred({
					type: "array",
					items: { type: "string" },
					additionalItems: { type: "number" }
				})
			).type.toString.snap("string[]")
		})

		it("prefixItems, items and additionalItems", () => {
			attest(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }],
					items: false,
					additionalItems: false
				})
			).type.toString.snap("[string?]")
		})
	})

	describe("messages", () => {
		it("schema keyword value kinds don't name internal interfaces", () => {
			const noInternalName =
				/^(?![\S\s]*(Statically|StaticDependencies|DependentRequired))[\S\s]*is not assignable/
			// @ts-expect-error
			attest(() => inferred({ type: "object", properties: 5 })).type.errors(
				noInternalName
			)
			// @ts-expect-error
			attest(() => inferred({ allOf: 5 })).type.errors(noInternalName)
			attest(() =>
				inferred({
					// @ts-expect-error
					anyOf: []
				})
			).type.errors(noInternalName)
			// @ts-expect-error
			attest(() => inferred({ type: "array", prefixItems: 5 })).type.errors(
				noInternalName
			)
			// @ts-expect-error
			attest(() => inferred({ dependencies: 5 })).type.errors(noInternalName)
			// @ts-expect-error
			attest(() => inferred({ dependentRequired: 5 })).type.errors(
				noInternalName
			)
		})

		it("a schema variable's error names validateKeywords", () => {
			const schema = { type: "strin" } as const
			// accepted: a non-literal argument's expected type prints as the alias
			// @ts-expect-error
			attest(() => jsonSchemaToType(schema)).type.errors.snap(
				"Argument of type '{ readonly type: \"strin\"; }' is not assignable to parameter of type 'validateKeywords<{ readonly type: \"strin\"; }, { readonly type: \"strin\"; }, \"document\">'.Types of property 'type' are incompatible.Type '\"strin\"' is not assignable to type 'TypeName'. Did you mean '\"string\"'?"
			)
		})

		it("a union argument's error names validateKeywords", () => {
			const schema = {} as { type: "string" } | { type: "strin" }
			// accepted: only the invalid member is expected, printed as the alias
			// @ts-expect-error
			attest(() => inferred(schema)).type.errors.snap(
				'Argument of type \'{ type: "string"; } | { type: "strin"; }\' is not assignable to parameter of type \'validateKeywords<{ type: "strin"; }, { type: "strin"; }, "document">\'.Type \'{ type: "strin"; }\' is not assignable to type \'validateKeywords<{ type: "strin"; }, { type: "strin"; }, "document">\'.Types of property \'type\' are incompatible.Type \'"strin"\' is not assignable to type \'TypeName\'. Did you mean \'"string"\'?'
			)
		})

		it("draft-07 dependencies with a non-string array", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					dependencies: { a: ["b", 1] }
				})
			).type.errors(`Type 'number' is not assignable to type 'string'`)
		})

		it("dependentRequired with a non-string entry", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					dependentRequired: { a: ["b", 1] }
				})
			).type.errors.snap("Type 'number' is not assignable to type 'string'.")
		})

		it("wrong value kinds in a nested schema", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						// @ts-expect-error
						a: { type: 5 }
					}
				})
			).type.errors("Type 'number' is not assignable to type 'TypeName'")
			attest(() =>
				inferred({
					type: "object",
					properties: {
						// @ts-expect-error
						a: { enum: 5 }
					}
				})
			).type.errors(
				"Type 'number' is not assignable to type 'readonly unknown[]'"
			)
			attest(() =>
				inferred({
					type: "object",
					properties: {
						// @ts-expect-error
						a: { exclusiveMinimum: "1" }
					}
				})
			).type.errors("Type 'string' is not assignable to type 'number'")
			attest(() =>
				inferred({
					type: "object",
					properties: {
						// @ts-expect-error
						a: { dependentRequired: { b: [1] } }
					}
				})
			).type.errors("Type 'number' is not assignable to type 'string'")
		})
	})

	describe("error placement", () => {
		it("type nested in every subschema position", () => {
			attest(() =>
				inferred({
					$defs: {
						// @ts-expect-error
						a: { type: "strin" }
					},
					definitions: {
						// @ts-expect-error
						b: { type: "strin" }
					},
					properties: {
						// @ts-expect-error
						c: { type: "strin" }
					},
					patternProperties: {
						// @ts-expect-error
						"^d": { type: "strin" }
					},
					dependentSchemas: {
						// @ts-expect-error
						e: { type: "strin" }
					},
					// @ts-expect-error
					additionalProperties: { type: "strin" },
					// @ts-expect-error
					items: { type: "strin" },
					// @ts-expect-error
					prefixItems: [true, { type: "strin" }],
					// @ts-expect-error
					contains: { type: "strin" },
					// @ts-expect-error
					allOf: [{ type: "strin" }],
					// @ts-expect-error
					anyOf: [{ type: "strin" }],
					// @ts-expect-error
					oneOf: [{ type: "strin" }],
					// @ts-expect-error
					not: { type: "strin" },
					// @ts-expect-error
					if: { type: "strin" },
					// @ts-expect-error
					then: { type: "strin" },
					// @ts-expect-error
					else: { type: "strin" }
				})
			).type.errors
				.snap(`Type '"strin"' is not assignable to type 'TypeName'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName | undefined'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName | undefined'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName | undefined'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName | undefined'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName | undefined'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName | undefined'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName | undefined'. Did you mean '"string"'?`)
		})

		it("draft-07 items list and additionalItems", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					items: [{ type: "strin" }],
					// @ts-expect-error
					additionalItems: { type: "strin" }
				})
			).type.errors(`Did you mean '"string"'?`)
		})

		it("deeply nested through every container kind", () => {
			attest(() =>
				inferred({
					$defs: {
						a: {
							anyOf: [
								{
									type: "array",
									items: {
										allOf: [
											{
												not: {
													if: {
														properties: {
															b: {
																type: "array",
																// @ts-expect-error
																prefixItems: [{ minLength: -1 }]
															}
														}
													}
												}
											}
										]
									}
								}
							]
						}
					}
				})
			).type.errors("minLength must be a non-negative integer (was -1)")
		})

		it("each error on its own leaf", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: {
							// @ts-expect-error
							type: "strng",
							// @ts-expect-error
							minLength: -1
						},
						b: {
							type: "array",
							// @ts-expect-error
							items: "string",
							// @ts-expect-error
							uniqueItems: "yes"
						}
					},
					// a $ref sibling may declare "c"
					required: ["c"],
					// @ts-expect-error
					$ref: "#/$defs/x"
				})
			).type.errors
				.snap(`Type '"strng"' is not assignable to type 'TypeName'. Did you mean '"string"'?
Type 'number' is not assignable to type '"minLength must be a non-negative integer (was -1)\u200b"'.
Type '"string"' is not assignable to type '"JSON Schema must be an object or a boolean (was string)\u200b"'.
Type 'string' is not assignable to type 'boolean'.
Type '"#/$defs/x"' is not assignable to type '"#"'.`)
		})

		it("valid siblings of an error don't error", () => {
			attest(() =>
				inferred({
					$defs: { ok: { type: "string" } },
					type: "object",
					properties: {
						a: { $ref: "#/$defs/ok" },
						b: { type: "array", items: { type: "number" }, minItems: 1 },
						c: { const: 1, title: "c" },
						// @ts-expect-error
						d: { type: "nul" }
					},
					required: ["a", "b"]
				})
			).type.errors.snap(
				"Type '\"nul\"' is not assignable to type 'TypeName'. Did you mean '\"null\"'?"
			)
		})

		it("jsonSchemaToType places errors the same way", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					items: {
						type: "object",
						properties: {
							// @ts-expect-error
							a: { type: "string", maxLength: -1 }
						}
					}
				})
			).type.errors("maxLength must be a non-negative integer (was -1)")
		})
	})

	describe("completions", () => {
		it("type in a list", () => {
			// @ts-expect-error
			attest(() => inferred({ type: ["string", "o"] })).completions({
				o: ["object"]
			})
		})

		it("every type name", () => {
			// @ts-expect-error
			attest(() => inferred({ type: "" })).completions({
				"": [
					"array",
					"boolean",
					"integer",
					"null",
					"number",
					"object",
					"string"
				]
			})
		})

		it("type nested in properties", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						// @ts-expect-error
						a: { type: "bo" }
					}
				})
			).completions({ bo: ["boolean"] })
		})

		it("type nested in anyOf", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					anyOf: [{ type: "in" }]
				})
			).completions({ in: ["integer"] })
		})

		it("propertyNames type", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					propertyNames: { type: "" }
				})
			).completions({ "": ["string"] })
		})

		it("a type beside a sibling error", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "str", minLength: -1 })
			).completions({ str: ["string"] })
		})

		it("required nested", () => {
			attest(() =>
				inferred({
					type: "array",
					items: {
						type: "object",
						properties: { alpha: true, beta: true },
						// @ts-expect-error
						required: ["al"]
					}
				})
			).completions({ al: ["alpha"] })
		})

		it("required second entry", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { alpha: true, beta: true },
					// @ts-expect-error
					required: ["alpha", "b"]
				})
			).completions({ b: ["beta"] })
		})

		it("every required key", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { b: true, a: true, c: true },
					// @ts-expect-error
					required: [""]
				})
			).completions({ "": ["a", "b", "c"] })
		})

		it("required beside allOf offers the node's own properties", () => {
			// any key is valid, since the allOf branch may declare it
			attest(() =>
				inferred({
					type: "object",
					properties: { alpha: {}, beta: {} },
					allOf: [{ properties: { gamma: {} } }],
					required: [""]
				})
			).completions({ "": ["alpha", "beta"] })
		})

		it("$ref root and definitions", () => {
			attest(() =>
				inferred({
					definitions: { node: true, leaf: true },
					// @ts-expect-error
					$ref: "#/"
				})
			).completions({ "#/": ["#/definitions/leaf", "#/definitions/node"] })
		})

		it("$ref completions for an empty ref", () => {
			attest(() =>
				inferred({
					$defs: { a: true },
					$ref: ""
				})
			).completions({ "": ["#", "#/$defs/a"] })
		})

		it("$ref nested", () => {
			attest(() =>
				inferred({
					$defs: { node: true },
					type: "object",
					properties: {
						// @ts-expect-error
						a: { $ref: "#/$defs/" }
					}
				})
			).completions({ "#/$defs/": ["#/$defs/node"] })
		})

		it("$ref escapes definition names", () => {
			attest(() =>
				inferred({
					$defs: { "a/b": true, "c~d": true },
					// @ts-expect-error
					$ref: "#/$defs/"
				})
			).completions({ "#/$defs/": ["#/$defs/a~1b", "#/$defs/c~0d"] })
		})

		it("keyword names by prefix", () => {
			attest(() =>
				// prettier-ignore
				inferred({ type: "string", "max": 1 })
			).completions({
				max: [
					"maxContains",
					"maxItems",
					"maxLength",
					"maxProperties",
					"maximum"
				]
			})
		})

		it("core keyword names", () => {
			attest(() =>
				// prettier-ignore
				inferred({ "$d": 1 })
			).completions({ $d: ["$defs", "$dynamicAnchor", "$dynamicRef"] })
		})

		it("keyword names nested in a valid schema", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						// prettier-ignore
						a: { type: "string", "minLe": 1 }
					}
				})
			).completions({ minLe: ["minLength"] })
		})

		it("keyword names nested in an invalid schema", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						// prettier-ignore
						a: { type: "string", "maxLe": 1 }
					},
					// @ts-expect-error
					required: ["b"]
				})
			).completions({ maxLe: ["maxLength"] })
		})

		it("keyword names in a tuple element", () => {
			attest(() =>
				inferred({
					// prettier-ignore
					allOf: [{ "unique": true }]
				})
			).completions({ unique: ["uniqueItems"] })
		})

		it("keyword names in every subschema position", () => {
			attest(() =>
				inferred({
					// prettier-ignore
					$defs: { a: { "minLe": 1 } },
					// prettier-ignore
					additionalProperties: { "maxLe": 1 },
					// prettier-ignore
					dependentSchemas: { a: { "minPr": 1 } },
					// prettier-ignore
					dependencies: { a: { "maxPr": 1 } },
					// prettier-ignore
					if: { "minIt": 1 },
					// prettier-ignore
					else: { "maxIt": 1 },
					// prettier-ignore
					contains: { "multip": 1 },
					// prettier-ignore
					propertyNames: { "patte": "^a" }
				})
			).completions({
				minLe: ["minLength"],
				maxLe: ["maxLength"],
				minPr: ["minProperties"],
				maxPr: ["maxProperties"],
				minIt: ["minItems"],
				maxIt: ["maxItems"],
				multip: ["multipleOf"],
				patte: ["pattern", "patternProperties"]
			})
		})

		it("keyword completions for an empty root object", () => {
			// a non-empty valid schema validates to keyword completions, so the editor offers keyword names
			attest(
				{} as jsonSchema.validate<{ properties: { a: {} } }>
			).type.toString.snap("KeywordCompletions")
			attest({} as jsonSchema.validate<{}>).type.toString.snap(
				"KeywordCompletions"
			)
		})

		it("jsonSchema type, required and $ref", () => {
			// @ts-expect-error
			attest(() => jsonSchema({ type: "nu" })).completions({
				nu: ["null", "number"]
			})
			attest(() =>
				jsonSchema({
					type: "object",
					properties: { alpha: {}, alps: {} },
					// @ts-expect-error
					required: ["al"]
				})
			).completions({ al: ["alpha", "alps"] })
			attest(() =>
				jsonSchema({
					$defs: { alpha: {}, alps: {} },
					// @ts-expect-error
					$ref: "#/$defs/al"
				})
			).completions({ "#/$defs/al": ["#/$defs/alpha", "#/$defs/alps"] })
		})
	})

	describe("any, never and JsonSchema", () => {
		it("root any and never", () => {
			attest<any>(inferred({} as any))
			attest<never>(inferred({} as never))
			attest<true, isValid<any>>()
			attest<true, isValid<never>>()
		})

		it("root unknown", () => {
			attest<unknown>(inferred({} as unknown))
		})

		it("root JsonSchema", () => {
			attest<unknown>(inferred({} as JsonSchema))
			attest<unknown>(inferred(true as JsonSchema.Branch))
			attest<unknown>(inferred({} as JsonSchemaOrBoolean))
		})

		it("root JsonSchema subtypes", () => {
			attest(() => inferred({} as JsonSchema.String)).type.errors.is("")
			attest(() => inferred({} as JsonSchema.Constrainable)).type.errors.is("")
			attest(() => inferred({} as JsonSchema.Const)).type.errors.is("")
			attest(() => inferred({} as JsonSchema.Enum)).type.errors.is("")
			attest(() => inferred({} as JsonSchema.Numeric)).type.errors.is("")
			attest(() => inferred({} as JsonSchema.Object)).type.errors.is("")
			attest(() => inferred({} as JsonSchema.Array)).type.errors.is("")
			attest(() => inferred({} as JsonSchema.Ref)).type.errors.is("")
			attest(() => inferred({} as JsonSchema.Union)).type.errors.is("")
		})

		it("JsonSchema member types nested and intersected", () => {
			attest<true, isValid<JsonSchema.Intersection>>()
			attest<true, isValid<{ anyOf: [JsonSchema.Object, JsonSchema.Ref] }>>()
			attest<
				true,
				isValid<{
					type: "object"
					properties: { a: JsonSchema.Numeric; b: JsonSchema.Ref }
					required: ["a", "b"]
				}>
			>()
			attest<
				true,
				isValid<{ $defs: { a: JsonSchema.Object }; $ref: "#/$defs/a" }>
			>()
			attest<
				true,
				isValid<JsonSchema.Object & { properties: { a: JsonSchema.String } }>
			>()
			attest<
				true,
				isValid<{ type: "array"; prefixItems: JsonSchema.Branch[] }>
			>()
			attest<true, isValid<{ not: JsonSchema }>>()
		})

		it("widened ref template", () => {
			const ref = "#/$defs/a" as `#/$defs/${string}`
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					$ref: ref
				})
			).type.errors.is("")
		})

		it("root object and records", () => {
			attest(() => inferred({} as object)).type.errors.is("")
			attest(() => inferred({} as Record<string, unknown>)).type.errors.is("")
			attest(() => inferred(true as boolean)).type.errors.is("")
		})

		it("nested any and never", () => {
			const T = inferred({
				type: "object",
				properties: { a: {} as any, b: {} as never },
				required: ["a", "b"]
			})
			attest<{ a: any; b: never }>(T).type.toString.snap("{ a: any; b: never }")
		})

		it("nested any items", () => {
			const T = inferred({ type: "array", items: {} as any })
			attest<any[]>(T).type.toString.snap("any[]")
		})

		it("nested any allOf", () => {
			const T = inferred({ allOf: [{} as any] })
			attest<0 extends 1 & typeof T ? true : false>(true)
			attest(T).type.toString.snap("any")
		})

		it("nested any required", () => {
			const T = inferred({ type: "object", required: {} as any })
			attest<object>(T).type.toString.snap("object")
		})

		it("nested any type", () => {
			const T = inferred({ type: {} as any })
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("nested JsonSchema", () => {
			const user: JsonSchema = { type: "string" }
			const T = inferred({
				type: "object",
				properties: { user },
				required: ["user"]
			})
			attest<{ user: unknown }>(T).type.toString.snap("{ user: unknown }")
		})

		it("nested JsonSchema anyOf", () => {
			const s = { type: "string" } as JsonSchema
			const T = inferred({ anyOf: [s, { type: "null" }] })
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("nested JsonSchema allOf", () => {
			const s = { type: "string" } as JsonSchema
			const T = inferred({ allOf: [s, { type: "string" }] })
			attest<string>(T).type.toString.snap("string")
		})

		it("nested non-const object", () => {
			const nested = {
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"]
			}
			const T = inferred({ type: "array", items: nested })
			attest<unknown[]>(T).type.toString.snap("unknown[]")
		})

		it("union of schemas", () => {
			const s =
				Math.random() > 0.5 ?
					({ type: "string" } as const)
				:	({ type: "number", minimum: 0 } as const)
			attest<string | number>(inferred(s))
		})
	})

	describe("OpenAPI components", () => {
		it("a non-object components value is an unknown keyword's value", () => {
			attest(() =>
				inferred({
					type: "string",
					components: "header"
				})
			).type.errors.is("")
			attest<true, isValid<{ type: "string"; components: 5 }>>()
		})

		it("an optional components slot that may be undefined", () => {
			attest<
				true,
				isValid<{
					type: "object"
					components?: { schemas: { a: { type: "string" } } } | undefined
				}>
			>()
			// the schemas are still validated
			attest<
				false,
				isValid<{
					type: "object"
					components?: { schemas: { a: { type: "strin" } } } | undefined
				}>
			>()
		})

		it("a union argument whose member has a non-object components value", () => {
			attest<
				true,
				isValid<{ type: "string"; components: 5 } | { type: "number" }>
			>()
		})

		it("the message for a non-object components.schemas value names no internal alias", () => {
			attest(() =>
				inferred({
					type: "string",
					components: {
						// @ts-expect-error
						schemas: 5
					}
				})
			).type.errors.snap(
				"Type 'number' is not assignable to type '{ readonly [k: string]: boolean | object; }'."
			)
		})

		it("a nested subschema's components value doesn't error beside an unrelated error", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: { minLength: 1, components: 5 }
					},
					// @ts-expect-error
					minLength: -1
				})
			).type.errors.is(
				"Type 'number' is not assignable to type '\"minLength must be a non-negative integer (was -1)\u200b\"'."
			)
		})

		it("components schemas are validated at the document root", () => {
			attest(() =>
				inferred({
					openapi: "3.1.0",
					components: {
						// @ts-expect-error
						schemas: { a: { type: "strin" } }
					}
				})
			).type.errors(`Did you mean '"string"'?`)
			attest(() =>
				inferred({
					openapi: "3.1.0",
					components: {
						// @ts-expect-error
						schemas: { a: 5 }
					}
				})
			).type.errors("JSON Schema must be an object or a boolean (was number)")
		})

		it("components in a subschema is an unknown keyword", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: { type: "string", components: { schemas: { b: 5 } } }
					}
				})
			).type.errors.is("")
			attest<
				true,
				isValid<{ type: "object"; properties: { a: { components: string } } }>
			>()
		})

		it("component ref suggestions", () => {
			attest(() =>
				inferred({
					openapi: "3.1.0",
					components: {
						schemas: {
							Pet: { type: "string" },
							// @ts-expect-error
							Owner: { type: "object", properties: { pet: { $ref: "#/c" } } }
						}
					}
				})
			).completions({
				"#/c": ["#/components/schemas/Owner", "#/components/schemas/Pet"]
			})
		})
	})

	describe("generic schema parameters", () => {
		it("a type parameter constrained to JsonSchema", () => {
			// a deferred jsonSchema.validate<schema> can't be related to an unresolved parameter, as for arktype's type(): validate the parameter instead (below)
			attest(<schema extends JsonSchema>(s: schema) =>
				// @ts-expect-error
				jsonSchemaToType(s)
			).type.errors("Argument of type 'schema' is not assignable")
		})

		it("a wrapper with a validated parameter", () => {
			const wrap = <const schema>(s: jsonSchema.validate<schema>) =>
				jsonSchemaToType(s as never)
			attest(() => wrap({ type: "string" })).type.errors.is("")
			// @ts-expect-error
			attest(() => wrap({ type: "strin" })).type.errors(
				`Did you mean '"string"'?`
			)
		})
	})

	describe("spread and rest of jsonSchema values", () => {
		it("a spread with an overridden type", () => {
			const s = jsonSchema({ type: "string" })
			const n = jsonSchema({ ...s, type: "number" })
			attest(n.infer).type.toString.snap("number")
			attest(
				jsonSchemaToType({ ...s, type: "number" }).infer
			).type.toString.snap("number")
		})

		it("a spread extending a base schema", () => {
			const base = jsonSchema({
				type: "object",
				properties: { a: { type: "string" } }
			})
			const derived = jsonSchema({ ...base, required: ["a"] })
			attest(derived.infer).type.toString.snap("{ a: string }")
			const extended = jsonSchema({
				...base,
				properties: { ...base.properties, b: { type: "number" } },
				required: ["b"]
			})
			attest(extended.infer).type.toString.snap("{ a?: string; b: number }")
		})

		it("a rest without the type keyword", () => {
			const { type: _, ...rest } = jsonSchema({ type: "string", minLength: 1 })
			attest(jsonSchema(rest).infer).type.toString.snap("unknown")
		})

		it("a spread of a jsonSchema.as value", () => {
			const s = jsonSchema.as<string>({ type: "string" })
			attest(jsonSchema({ ...s, type: "number" }).infer).type.toString.snap(
				"number"
			)
		})

		it("a spread inside another schema infers its own keywords", () => {
			const s = jsonSchema({ type: "string" })
			const list = jsonSchema({
				type: "array",
				items: { ...s, type: "number" }
			})
			attest<number[]>(list.infer)
		})
	})

	describe("composing jsonSchema values", () => {
		it("an order document composed from several values", () => {
			const Id = jsonSchema({ type: "string", format: "uuid" })
			const Money = jsonSchema({
				type: "object",
				properties: {
					amount: { type: "number" },
					currency: { type: "string", enum: ["USD", "EUR"] }
				},
				required: ["amount", "currency"]
			})
			const LineItem = jsonSchema({
				type: "object",
				properties: {
					id: Id,
					price: Money,
					qty: { type: "integer", minimum: 1 }
				},
				required: ["id", "price", "qty"]
			})
			const Order = jsonSchema({
				type: "object",
				properties: {
					id: Id,
					items: { type: "array", items: LineItem, minItems: 1 },
					total: Money,
					status: { enum: ["open", "paid"] }
				},
				required: ["id", "items", "total", "status"],
				additionalProperties: false
			})
			const Customer = jsonSchema({
				type: "object",
				properties: {
					id: Id,
					orders: { type: "array", items: Order },
					primary: { anyOf: [Order, { type: "null" }] }
				},
				required: ["id", "orders"]
			})
			type Money = { amount: number; currency: "USD" | "EUR" }
			type Order = {
				id: string
				items: { id: string; price: Money; qty: number }[]
				total: Money
				status: "open" | "paid"
			}
			attest<{ id: string; orders: Order[]; primary?: Order | null }>(
				Customer.infer
			)
			const toType = () => jsonSchemaToType(Customer)
			attest<{ id: string; orders: Order[]; primary?: Order | null }>(
				{} as ReturnType<typeof toType>["infer"]
			)
			attest(() =>
				jsonSchema({
					type: "object",
					properties: {
						customer: Customer,
						// @ts-expect-error
						note: { type: "string", minLength: -1 }
					}
				})
			).type.errors("minLength must be a non-negative integer (was -1)")
		})

		it("a composed schema's relative ref resolves against the new root", () => {
			const User = jsonSchema({
				$defs: { name: { type: "string" } },
				type: "object",
				properties: { name: { $ref: "#/$defs/name" } }
			})
			attest<{ name?: string }>(User.infer)
			// the new document has no $defs
			attest(() =>
				// @ts-expect-error
				jsonSchema({ type: "array", items: User })
			).type.errors(`Type '"#/$defs/name"' is not assignable to type '"#"'`)
		})

		it("a value with its own $id keeps its refs when composed", () => {
			const User = jsonSchema({
				$id: "https://example.com/user.json",
				$defs: { name: { type: "string" } },
				type: "object",
				properties: {
					name: { $ref: "#/$defs/name" },
					friends: { type: "array", items: { $ref: "#" } }
				},
				required: ["name"]
			})
			const Users = jsonSchema({ type: "array", items: User })
			// tsrs predates microsoft/TypeScript#64556, so it prints recursive arrays deeper
			if (getChecker() !== "tsrs") {
				attest(Users.infer).type.toString.snap(
					"{ name: string; friends?: cyclic }[]"
				)
			}
			type user = (typeof Users.infer)[number]
			attest<user, NonNullable<user["friends"]>[number]>()
		})

		it("boolean values", () => {
			const nothing = jsonSchema(false)
			const anything = jsonSchema(true)
			const s = jsonSchema({
				type: "object",
				properties: { nothing, anything },
				required: ["nothing"]
			})
			attest(s.infer).type.toString.snap(
				"{ nothing: never; anything?: unknown }"
			)
		})

		it("a jsonSchema.as value is a valid subschema", () => {
			const User = jsonSchema.as<{ name: string }>({})
			attest(() =>
				jsonSchema({ type: "array", items: User, minItems: 1 })
			).type.errors.is("")
		})
	})

	describe("real-world schemas", () => {
		it("OpenAPI 3.0 component schema", () => {
			const Pet = inferred({
				type: "object",
				required: ["id", "name"],
				properties: {
					id: { type: "integer", format: "int64", readOnly: true, example: 10 },
					name: { type: "string", example: "doggie", nullable: true },
					tag: { type: "string", nullable: true, xml: { name: "tag" } },
					status: {
						type: "string",
						description: "pet status in the store",
						enum: ["available", "pending", "sold"]
					},
					photoUrls: {
						type: "array",
						xml: { wrapped: true },
						items: { type: "string", xml: { name: "photoUrl" } }
					}
				},
				discriminator: { propertyName: "status" },
				externalDocs: { url: "https://example.com" },
				xml: { name: "pet" }
			})
			attest<{
				id: number
				name: string | null
				tag?: string | null
				status?: "available" | "pending" | "sold"
				photoUrls?: string[]
			}>(Pet).type.toString.snap(`{
	id: number
	name: string | null
	tag?: string | null
	status?: "available" | "pending" | "sold"
	photoUrls?: string[]
}`)
		})

		it("OpenAPI 3.0 document refs", () => {
			const Pet = inferred({
				components: {
					schemas: {
						Category: {
							type: "object",
							properties: { id: { type: "integer" } }
						},
						Pet: {
							type: "object",
							properties: {
								category: { $ref: "#/components/schemas/Category" }
							}
						}
					}
				},
				$ref: "#/components/schemas/Pet"
			})
			attest<{ category?: { id?: number } }>(Pet).type.toString.snap(
				"{ category?: { id?: number } }"
			)
		})

		it("draft-07 with definitions", () => {
			const T = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				$id: "https://example.com/address.schema.json",
				definitions: {
					address: {
						type: "object",
						properties: {
							street: { type: "string" },
							city: { type: "string" },
							zip: { type: "string", pattern: "^[0-9]{5}$" }
						},
						required: ["street", "city"],
						additionalProperties: false
					}
				},
				type: "object",
				properties: {
					billing: { $ref: "#/definitions/address" },
					shipping: {
						allOf: [
							{ $ref: "#/definitions/address" },
							{ properties: { method: { enum: ["ground", "air"] } } }
						]
					}
				},
				required: ["billing"]
			})
			attest<{
				billing: { street: string; city: string; zip?: string }
				shipping?: {
					street: string
					city: string
					zip?: string
					method?: "ground" | "air"
				}
			}>(T).type.toString.snap(`{
	billing: { street: string; city: string; zip?: string }
	shipping?: {
		street: string
		city: string
		zip?: string
		method?: "air" | "ground"
	}
}`)
		})

		it("2020-12 with $defs", () => {
			const T = inferred({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				$id: "https://example.com/tree",
				$dynamicAnchor: "node",
				$defs: {
					point: {
						type: "array",
						prefixItems: [{ type: "number" }, { type: "number" }],
						minItems: 2,
						items: false
					}
				},
				type: "object",
				properties: {
					data: true,
					position: { $ref: "#/$defs/point" },
					children: { type: "array", items: { $ref: "#" } }
				},
				required: ["position"]
			})
			attest<[number, number]>(T.position)
			attest<unknown>(T.data)
			attest<[number, number] | undefined>(T.children?.[0].position)
		})

		it("arktype toJsonSchema output", () => {
			// type({ name: "string", "age?": "number.integer >= 0", tags: "string[]", kind: "'a' | 'b'" }).toJsonSchema()
			const T = jsonSchemaToType({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: {
					age: { type: "integer", minimum: 0 },
					kind: { enum: ["a", "b"] },
					name: { type: "string" },
					tags: { type: "array", items: { type: "string" } }
				},
				required: ["kind", "name", "tags"]
			})
			attest<{
				age?: number
				kind: "a" | "b"
				name: string
				tags: string[]
			}>(T.infer).type.toString.snap(`{
	age?: number
	kind: "a" | "b"
	name: string
	tags: string[]
}`)
		})

		it("package.json-like", () => {
			const T = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				title: "JSON schema for NPM package.json files",
				definitions: {
					person: {
						description:
							"A person who has been involved in creating or maintaining this package.",
						type: ["object", "string"],
						required: ["name"],
						properties: {
							name: { type: "string" },
							url: { type: "string", format: "uri" },
							email: { type: "string", format: "email" }
						}
					},
					dependency: {
						description:
							"Dependencies are specified with a simple hash of package name to version range.",
						type: "object",
						additionalProperties: { type: "string" }
					},
					scriptsInstallAfter: {
						description: "Run AFTER the package is installed.",
						type: "string",
						"x-intellij-language-injection": "Shell Script"
					}
				},
				type: "object",
				patternProperties: {
					"^_": {
						description: "Any property starting with _ is valid.",
						tsType: "any"
					}
				},
				properties: {
					name: {
						type: "string",
						maxLength: 214,
						minLength: 1,
						pattern:
							"^(?:(?:@(?:[a-z0-9-*~][a-z0-9-*._~]*)?/[a-z0-9-._~])|[a-z0-9-~])[a-z0-9-._~]*$"
					},
					version: { type: "string" },
					keywords: { type: "array", items: { type: "string" } },
					author: { $ref: "#/definitions/person" },
					contributors: {
						type: "array",
						items: { $ref: "#/definitions/person" }
					},
					bin: {
						type: ["string", "object"],
						additionalProperties: { type: "string" }
					},
					scripts: {
						type: "object",
						properties: {
							postinstall: { $ref: "#/definitions/scriptsInstallAfter" }
						},
						additionalProperties: { type: "string" }
					},
					dependencies: { $ref: "#/definitions/dependency" },
					private: {
						oneOf: [{ type: "boolean" }, { enum: ["false", "true"] }]
					},
					workspaces: {
						anyOf: [
							{ type: "array", items: { type: "string" } },
							{
								type: "object",
								properties: {
									packages: { type: "array", items: { type: "string" } }
								}
							}
						]
					}
				},
				anyOf: [
					{
						type: "object",
						not: { required: ["bundledDependencies", "bundleDependencies"] }
					},
					{
						type: "object",
						not: { required: ["bundleDependencies"] },
						required: ["bundledDependencies"]
					}
				]
			})
			attest<string | undefined>(T.name)
			attest<
				{ name: string; url?: string; email?: string } | string | undefined
			>(T.author)
			attest<{ [k: string]: string } | undefined>(T.dependencies)
			attest<boolean | "false" | "true" | undefined>(T.private)
		})

		it("GitHub workflow-like", () => {
			const T = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				$id: "https://json.schemastore.org/github-workflow.json",
				definitions: {
					env: {
						type: ["object", "string"],
						additionalProperties: {
							oneOf: [
								{ type: "string" },
								{ type: "number" },
								{ type: "boolean" }
							]
						}
					},
					event: {
						type: "string",
						enum: ["push", "pull_request", "workflow_dispatch"]
					},
					"runs-on": {
						oneOf: [
							{ type: "string" },
							{ type: "array", items: { type: "string" }, minItems: 1 }
						]
					},
					step: {
						type: "object",
						additionalProperties: false,
						dependencies: {
							"working-directory": ["run"],
							shell: ["run"]
						},
						oneOf: [{ required: ["uses"] }, { required: ["run"] }],
						properties: {
							id: { type: "string" },
							if: { type: ["boolean", "number", "string"] },
							name: { type: "string" },
							uses: { type: "string" },
							run: { type: "string" },
							"working-directory": { type: "string" },
							with: { $ref: "#/definitions/env" },
							env: { $ref: "#/definitions/env" },
							"continue-on-error": {
								oneOf: [{ type: "boolean" }, { type: "string" }],
								default: false
							}
						}
					},
					normalJob: {
						type: "object",
						properties: {
							name: { type: "string" },
							needs: {
								oneOf: [
									{ type: "array", items: { type: "string" }, minItems: 1 },
									{ type: "string" }
								]
							},
							"runs-on": { $ref: "#/definitions/runs-on" },
							steps: {
								type: "array",
								items: { $ref: "#/definitions/step" },
								minItems: 1
							},
							"timeout-minutes": { type: "number", default: 360 }
						},
						required: ["runs-on"],
						additionalProperties: false
					}
				},
				type: "object",
				properties: {
					name: { type: "string", markdownDescription: "The **name**" },
					on: {
						oneOf: [
							{ $ref: "#/definitions/event" },
							{
								type: "array",
								items: { $ref: "#/definitions/event" },
								minItems: 1
							},
							{
								type: "object",
								properties: { push: { type: ["null", "object"] } }
							}
						]
					},
					env: { $ref: "#/definitions/env" },
					jobs: {
						type: "object",
						patternProperties: {
							"^[_a-zA-Z][a-zA-Z0-9_-]*$": { $ref: "#/definitions/normalJob" }
						},
						minProperties: 1,
						additionalProperties: false
					}
				},
				required: ["on", "jobs"],
				additionalProperties: false
			})
			attest<string | undefined>(T.name)
			attest<
				| "push"
				| "pull_request"
				| "workflow_dispatch"
				| ("push" | "pull_request" | "workflow_dispatch")[]
				| { push?: object | null }
			>(T.on)
			attest<string | string[]>(T.jobs?.build?.["runs-on"])
		})

		it("draft-04 meta-schema", () => {
			// draft-04 `id` with a draft-04 `$schema` and string-array dependencies.
			// Its boolean exclusiveMinimum is unsupported.
			attest(() =>
				inferred({
					id: "http://json-schema.org/draft-04/schema#",
					$schema: "http://json-schema.org/draft-04/schema#",
					description: "Core schema meta-schema",
					definitions: {
						schemaArray: { type: "array", minItems: 1, items: { $ref: "#" } },
						positiveInteger: { type: "integer", minimum: 0 },
						positiveIntegerDefault0: {
							allOf: [{ $ref: "#/definitions/positiveInteger" }, { default: 0 }]
						},
						simpleTypes: {
							enum: [
								"array",
								"boolean",
								"integer",
								"null",
								"number",
								"object",
								"string"
							]
						},
						stringArray: {
							type: "array",
							items: { type: "string" },
							minItems: 1,
							uniqueItems: true
						}
					},
					type: "object",
					properties: {
						id: { type: "string" },
						$schema: { type: "string" },
						title: { type: "string" },
						description: { type: "string" },
						default: {},
						// @ts-expect-error
						multipleOf: { type: "number", minimum: 0, exclusiveMinimum: true },
						maximum: { type: "number" },
						exclusiveMaximum: { type: "boolean", default: false },
						minimum: { type: "number" },
						exclusiveMinimum: { type: "boolean", default: false },
						maxLength: { $ref: "#/definitions/positiveInteger" },
						minLength: { $ref: "#/definitions/positiveIntegerDefault0" },
						pattern: { type: "string", format: "regex" },
						additionalItems: {
							anyOf: [{ type: "boolean" }, { $ref: "#" }],
							default: {}
						},
						items: {
							anyOf: [{ $ref: "#" }, { $ref: "#/definitions/schemaArray" }],
							default: {}
						},
						maxItems: { $ref: "#/definitions/positiveInteger" },
						minItems: { $ref: "#/definitions/positiveIntegerDefault0" },
						uniqueItems: { type: "boolean", default: false },
						maxProperties: { $ref: "#/definitions/positiveInteger" },
						minProperties: { $ref: "#/definitions/positiveIntegerDefault0" },
						required: { $ref: "#/definitions/stringArray" },
						additionalProperties: {
							anyOf: [{ type: "boolean" }, { $ref: "#" }],
							default: {}
						},
						definitions: {
							type: "object",
							additionalProperties: { $ref: "#" },
							default: {}
						},
						properties: {
							type: "object",
							additionalProperties: { $ref: "#" },
							default: {}
						},
						patternProperties: {
							type: "object",
							additionalProperties: { $ref: "#" },
							default: {}
						},
						dependencies: {
							type: "object",
							additionalProperties: {
								anyOf: [{ $ref: "#" }, { $ref: "#/definitions/stringArray" }]
							}
						},
						enum: { type: "array", minItems: 1, uniqueItems: true },
						type: {
							anyOf: [
								{ $ref: "#/definitions/simpleTypes" },
								{
									type: "array",
									items: { $ref: "#/definitions/simpleTypes" },
									minItems: 1,
									uniqueItems: true
								}
							]
						},
						format: { type: "string" },
						allOf: { $ref: "#/definitions/schemaArray" },
						anyOf: { $ref: "#/definitions/schemaArray" },
						oneOf: { $ref: "#/definitions/schemaArray" },
						not: { $ref: "#" }
					},
					dependencies: {
						exclusiveMaximum: ["maximum"],
						exclusiveMinimum: ["minimum"]
					},
					default: {}
				})
			).type.errors(
				"boolean exclusiveMinimum isn't supported by jsonSchemaToType"
			)
		})

		it("draft-07 meta-schema", () => {
			const Meta = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				$id: "http://json-schema.org/draft-07/schema#",
				title: "Core schema meta-schema",
				definitions: {
					schemaArray: { type: "array", minItems: 1, items: { $ref: "#" } },
					nonNegativeInteger: { type: "integer", minimum: 0 },
					nonNegativeIntegerDefault0: {
						allOf: [
							{ $ref: "#/definitions/nonNegativeInteger" },
							{ default: 0 }
						]
					},
					simpleTypes: {
						enum: [
							"array",
							"boolean",
							"integer",
							"null",
							"number",
							"object",
							"string"
						]
					},
					stringArray: {
						type: "array",
						items: { type: "string" },
						uniqueItems: true,
						default: []
					}
				},
				type: ["object", "boolean"],
				properties: {
					$id: { type: "string", format: "uri-reference" },
					$schema: { type: "string", format: "uri" },
					$ref: { type: "string", format: "uri-reference" },
					$comment: { type: "string" },
					title: { type: "string" },
					description: { type: "string" },
					default: true,
					readOnly: { type: "boolean", default: false },
					writeOnly: { type: "boolean", default: false },
					examples: { type: "array", items: true },
					multipleOf: { type: "number", exclusiveMinimum: 0 },
					maximum: { type: "number" },
					exclusiveMaximum: { type: "number" },
					minimum: { type: "number" },
					exclusiveMinimum: { type: "number" },
					maxLength: { $ref: "#/definitions/nonNegativeInteger" },
					minLength: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
					pattern: { type: "string", format: "regex" },
					additionalItems: { $ref: "#" },
					items: {
						anyOf: [{ $ref: "#" }, { $ref: "#/definitions/schemaArray" }],
						default: true
					},
					maxItems: { $ref: "#/definitions/nonNegativeInteger" },
					minItems: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
					uniqueItems: { type: "boolean", default: false },
					contains: { $ref: "#" },
					maxProperties: { $ref: "#/definitions/nonNegativeInteger" },
					minProperties: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
					required: { $ref: "#/definitions/stringArray" },
					additionalProperties: { $ref: "#" },
					definitions: {
						type: "object",
						additionalProperties: { $ref: "#" },
						default: {}
					},
					properties: {
						type: "object",
						additionalProperties: { $ref: "#" },
						default: {}
					},
					patternProperties: {
						type: "object",
						additionalProperties: { $ref: "#" },
						propertyNames: { format: "regex" },
						default: {}
					},
					dependencies: {
						type: "object",
						additionalProperties: {
							anyOf: [{ $ref: "#" }, { $ref: "#/definitions/stringArray" }]
						}
					},
					propertyNames: { $ref: "#" },
					const: true,
					enum: { type: "array", items: true },
					type: {
						anyOf: [
							{ $ref: "#/definitions/simpleTypes" },
							{
								type: "array",
								items: { $ref: "#/definitions/simpleTypes" },
								minItems: 1,
								uniqueItems: true
							}
						]
					},
					format: { type: "string" },
					contentMediaType: { type: "string" },
					contentEncoding: { type: "string" },
					if: { $ref: "#" },
					then: { $ref: "#" },
					else: { $ref: "#" },
					allOf: { $ref: "#/definitions/schemaArray" },
					anyOf: { $ref: "#/definitions/schemaArray" },
					oneOf: { $ref: "#/definitions/schemaArray" },
					not: { $ref: "#" }
				},
				default: true
			})
			type Meta = typeof Meta
			if (typeof Meta === "object") {
				attest<string | undefined>(Meta.$id)
				attest<number | undefined>(Meta.minLength)
				attest<string[] | undefined>(Meta.required)
				attest<
					| "array"
					| "boolean"
					| "integer"
					| "null"
					| "number"
					| "object"
					| "string"
					| (
							| "array"
							| "boolean"
							| "integer"
							| "null"
							| "number"
							| "object"
							| "string"
					  )[]
					| undefined
				>(Meta.type)
				attest<Meta | undefined>(Meta.not)
				attest<Meta | Meta[] | undefined>(Meta.items)
				attest<{ [k: string]: Meta } | undefined>(Meta.properties)
			}
		})

		it("2020-12 validation vocabulary meta-schema", () => {
			const Meta = inferred({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				$id: "https://json-schema.org/draft/2020-12/meta/validation",
				$dynamicAnchor: "meta",
				title: "Validation vocabulary meta-schema",
				type: ["object", "boolean"],
				properties: {
					type: {
						anyOf: [
							{ $ref: "#/$defs/simpleTypes" },
							{
								type: "array",
								items: { $ref: "#/$defs/simpleTypes" },
								minItems: 1,
								uniqueItems: true
							}
						]
					},
					const: true,
					enum: { type: "array", items: true },
					multipleOf: { type: "number", exclusiveMinimum: 0 },
					maximum: { type: "number" },
					exclusiveMaximum: { type: "number" },
					minimum: { type: "number" },
					exclusiveMinimum: { type: "number" },
					maxLength: { $ref: "#/$defs/nonNegativeInteger" },
					minLength: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
					pattern: { type: "string", format: "regex" },
					maxItems: { $ref: "#/$defs/nonNegativeInteger" },
					minItems: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
					uniqueItems: { type: "boolean", default: false },
					maxContains: { $ref: "#/$defs/nonNegativeInteger" },
					minContains: { $ref: "#/$defs/nonNegativeInteger", default: 1 },
					maxProperties: { $ref: "#/$defs/nonNegativeInteger" },
					minProperties: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
					required: { $ref: "#/$defs/stringArray" },
					dependentRequired: {
						type: "object",
						additionalProperties: { $ref: "#/$defs/stringArray" }
					}
				},
				$defs: {
					nonNegativeInteger: { type: "integer", minimum: 0 },
					nonNegativeIntegerDefault0: {
						$ref: "#/$defs/nonNegativeInteger",
						default: 0
					},
					simpleTypes: {
						enum: [
							"array",
							"boolean",
							"integer",
							"null",
							"number",
							"object",
							"string"
						]
					},
					stringArray: {
						type: "array",
						items: { type: "string" },
						uniqueItems: true,
						default: []
					}
				}
			})
			if (typeof Meta === "object") {
				attest<number | undefined>(Meta.minLength)
				attest<number | undefined>(Meta.minContains)
				attest<{ [k: string]: string[] } | undefined>(Meta.dependentRequired)
			}
		})

		it("2020-12 applicator vocabulary meta-schema", () => {
			attest(() =>
				inferred({
					$schema: "https://json-schema.org/draft/2020-12/schema",
					$id: "https://json-schema.org/draft/2020-12/meta/applicator",
					$dynamicAnchor: "meta",
					title: "Applicator vocabulary meta-schema",
					type: ["object", "boolean"],
					properties: {
						prefixItems: { $ref: "#/$defs/schemaArray" },
						// @ts-expect-error
						items: { $dynamicRef: "#meta" },
						// @ts-expect-error
						contains: { $dynamicRef: "#meta" },
						// @ts-expect-error
						additionalProperties: { $dynamicRef: "#meta" },
						properties: {
							type: "object",
							// @ts-expect-error
							additionalProperties: { $dynamicRef: "#meta" },
							default: {}
						},
						patternProperties: {
							type: "object",
							// @ts-expect-error
							additionalProperties: { $dynamicRef: "#meta" },
							propertyNames: { format: "regex" },
							default: {}
						},
						dependentSchemas: {
							type: "object",
							// @ts-expect-error
							additionalProperties: { $dynamicRef: "#meta" },
							default: {}
						},
						// @ts-expect-error
						propertyNames: { $dynamicRef: "#meta" },
						// @ts-expect-error
						if: { $dynamicRef: "#meta" },
						// @ts-expect-error
						then: { $dynamicRef: "#meta" },
						// @ts-expect-error
						else: { $dynamicRef: "#meta" },
						allOf: { $ref: "#/$defs/schemaArray" },
						anyOf: { $ref: "#/$defs/schemaArray" },
						oneOf: { $ref: "#/$defs/schemaArray" },
						// @ts-expect-error
						not: { $dynamicRef: "#meta" }
					},
					$defs: {
						schemaArray: {
							type: "array",
							minItems: 1,
							// @ts-expect-error
							items: { $dynamicRef: "#meta" }
						}
					}
				})
			).type.errors("$dynamicRef isn't supported by jsonSchemaToType")
		})

		it("2020-12 top-level meta-schema", () => {
			attest(() =>
				inferred({
					$schema: "https://json-schema.org/draft/2020-12/schema",
					$id: "https://json-schema.org/draft/2020-12/schema",
					$vocabulary: {
						"https://json-schema.org/draft/2020-12/vocab/core": true,
						"https://json-schema.org/draft/2020-12/vocab/applicator": true,
						"https://json-schema.org/draft/2020-12/vocab/format-annotation": true
					},
					$dynamicAnchor: "meta",
					title: "Core and Validation specifications meta-schema",
					allOf: [
						{ $ref: "meta/core" },
						{ $ref: "meta/applicator" },
						{ $ref: "meta/validation" }
					],
					type: ["object", "boolean"],
					$comment:
						"This meta-schema also defines keywords that have appeared in previous drafts",
					properties: {
						definitions: {
							$comment: '"definitions" has been replaced by "$defs".',
							type: "object",
							// @ts-expect-error
							additionalProperties: { $dynamicRef: "#meta" },
							deprecated: true,
							default: {}
						},
						dependencies: {
							type: "object",
							additionalProperties: {
								anyOf: [
									// @ts-expect-error
									{ $dynamicRef: "#meta" },
									{ $ref: "meta/validation#/$defs/stringArray" }
								]
							},
							deprecated: true,
							default: {}
						}
					}
				})
			).type.errors("$dynamicRef isn't supported by jsonSchemaToType")
		})
	})

	describe("depth", () => {
		it("11 levels of nested literal properties", () => {
			const T = inferred({
				type: "object",
				properties: {
					a: {
						type: "object",
						properties: {
							a: {
								type: "object",
								properties: {
									a: {
										type: "object",
										properties: {
											a: {
												type: "object",
												properties: {
													a: {
														type: "object",
														properties: {
															a: {
																type: "object",
																properties: {
																	a: {
																		type: "object",
																		properties: {
																			a: {
																				type: "object",
																				properties: {
																					a: {
																						type: "object",
																						properties: {
																							a: {
																								type: "object",
																								properties: {
																									a: {
																										type: "string",
																										minLength: 1
																									}
																								},
																								required: ["a"]
																							}
																						},
																						required: ["a"]
																					}
																				},
																				required: ["a"]
																			}
																		},
																		required: ["a"]
																	}
																},
																required: ["a"]
															}
														},
														required: ["a"]
													}
												},
												required: ["a"]
											}
										},
										required: ["a"]
									}
								},
								required: ["a"]
							}
						},
						required: ["a"]
					}
				},
				required: ["a"]
			})
			attest<string>(T.a?.a?.a?.a?.a?.a?.a?.a?.a?.a?.a)
		})

		it("30 levels of nested hand-written properties", () => {
			type nest<depth extends 1[], leaf> =
				depth extends [1, ...infer rest extends 1[]] ?
					{
						type: "object"
						properties: { a: nest<rest, leaf> }
						required: ["a"]
					}
				:	leaf
			type Thirty = [
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1
			]
			type Deep = nest<Thirty, { type: "string"; minLength: 1 }>
			attest<true, isValid<Deep>>()
			type get<t, depth extends 1[]> =
				depth extends [1, ...infer rest extends 1[]] ?
					get<t[keyof t & "a"], rest>
				:	t
			attest<string, get<jsonSchema.infer<Deep>, Thirty>>()
		})

		it("errors deep in hand-written schema types", () => {
			attest<
				false,
				isValid<{
					type: "object"
					properties: {
						a: {
							type: "object"
							properties: {
								a: {
									type: "object"
									properties: {
										a: {
											type: "object"
											properties: {
												a: {
													type: "object"
													properties: { a: { type: "string"; minLength: -1 } }
												}
											}
										}
									}
								}
							}
						}
					}
				}>
			>()
		})

		it("dependencies nested thirty-two deep", () => {
			// prettier-ignore
			attest(() => jsonSchemaToType({ dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { dependencies: { a: { type: "string" } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } })).type.errors.is("")
		})

		it("properties nested forty deep with a leaf only tier 3 accepts", () => {
			// the leaf's branches require keys they don't declare, which fails tier 2 along the whole path
			// prettier-ignore
			attest(() => jsonSchemaToType({ type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { oneOf: [{ required: ["x"] }, { required: ["y"] }] } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } })).type.errors.is("")
		})

		it("an invalid leaf under allOf nested forty deep", () => {
			// prettier-ignore
			// @ts-expect-error
			attest(() => jsonSchemaToType({ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ type: "string", minLength: -1 }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] })).type.errors("minLength must be a non-negative integer (was -1)")
		})

		it("allOf with a boolean branch nested forty deep", () => {
			// tier-1 lists are object-only, so a boolean branch falls back to tier 2 at every level
			// prettier-ignore
			attest(() => jsonSchemaToType({ allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { allOf: [true, { type: "string" }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] })).type.errors.is("")
		})
	})
})

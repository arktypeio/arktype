import { attest, contextualize } from "@ark/attest"
import { jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import type { array } from "@ark/util"
import { type, type JsonSchema } from "arktype"

// Bug tests assert the correct behavior and fail until fixed. Where attest<expected>
// would reject the wrong actual at compile time, only the display is asserted.

// like jsonSchemaToType, the result is read back with `infer` so attest's
// contextual type isn't inferred into jsonSchema.infer
const inferred = <const schema, r = jsonSchema.infer<schema>>(
	schema: jsonSchema.validate<schema>
): r extends infer _ ? _ : never => schema as never

// infers a hand-written (mutable, unvalidated) schema type
const inferType = <schema>(): jsonSchema.infer<schema> => ({}) as never

// JSONSchema7 from @types/json-schema, the most common schema type in the wild
interface JSONSchema7 {
	$id?: string | undefined
	$ref?: string | undefined
	$schema?: string | undefined
	$comment?: string | undefined
	$defs?: { [key: string]: JSONSchema7Definition } | undefined
	type?: JSONSchema7TypeName | JSONSchema7TypeName[] | undefined
	enum?: JSONSchema7Type[] | undefined
	const?: JSONSchema7Type | undefined
	multipleOf?: number | undefined
	maximum?: number | undefined
	exclusiveMaximum?: number | undefined
	minimum?: number | undefined
	exclusiveMinimum?: number | undefined
	maxLength?: number | undefined
	minLength?: number | undefined
	pattern?: string | undefined
	items?: JSONSchema7Definition | JSONSchema7Definition[] | undefined
	additionalItems?: JSONSchema7Definition | undefined
	maxItems?: number | undefined
	minItems?: number | undefined
	uniqueItems?: boolean | undefined
	contains?: JSONSchema7Definition | undefined
	maxProperties?: number | undefined
	minProperties?: number | undefined
	required?: string[] | undefined
	properties?: { [key: string]: JSONSchema7Definition } | undefined
	patternProperties?: { [key: string]: JSONSchema7Definition } | undefined
	additionalProperties?: JSONSchema7Definition | undefined
	dependencies?: { [key: string]: JSONSchema7Definition | string[] } | undefined
	propertyNames?: JSONSchema7Definition | undefined
	if?: JSONSchema7Definition | undefined
	then?: JSONSchema7Definition | undefined
	else?: JSONSchema7Definition | undefined
	allOf?: JSONSchema7Definition[] | undefined
	anyOf?: JSONSchema7Definition[] | undefined
	oneOf?: JSONSchema7Definition[] | undefined
	not?: JSONSchema7Definition | undefined
	format?: string | undefined
	definitions?: { [key: string]: JSONSchema7Definition } | undefined
	title?: string | undefined
	description?: string | undefined
	default?: JSONSchema7Type | undefined
	readOnly?: boolean | undefined
	writeOnly?: boolean | undefined
	examples?: JSONSchema7Type | undefined
}

type JSONSchema7Definition = JSONSchema7 | boolean

type JSONSchema7TypeName =
	| "string"
	| "number"
	| "integer"
	| "boolean"
	| "object"
	| "array"
	| "null"

type JSONSchema7Type =
	| string
	| number
	| boolean
	| JSONSchema7Object
	| JSONSchema7Array
	| null

interface JSONSchema7Object {
	[key: string]: JSONSchema7Type
}

interface JSONSchema7Array extends Array<JSONSchema7Type> {}

interface StringSchemaInterface {
	type: "string"
}

contextualize(() => {
	describe("guards", () => {
		it("any and never", () => {
			attest<any>(inferType<any>())
			attest<never>(inferType<never>()).type.toString.snap("never")
		})

		it("supertypes of JsonSchema", () => {
			attest<unknown>(inferType<{}>()).type.toString.snap("unknown")
			attest<unknown>(inferType<object>()).type.toString.snap("unknown")
			attest<unknown>(inferType<unknown>()).type.toString.snap("unknown")
			attest<unknown>(
				inferType<{ title?: string; description?: string }>()
			).type.toString.snap("unknown")
		})

		it("non-schema roots", () => {
			attest(() =>
				// @ts-expect-error
				inferred("string")
			).type.errors("JSON Schema must be an object or a boolean (was string)")
			attest(() =>
				// @ts-expect-error
				inferred(null)
			).type.errors("JSON Schema must be an object or a boolean (was null)")
			attest(() =>
				// @ts-expect-error
				inferred(5)
			).type.errors("JSON Schema must be an object or a boolean (was number)")
			attest(() =>
				// @ts-expect-error
				inferred([{ type: "string" }])
			).type.errors("JSON Schema must be an object or a boolean (was array)")
		})
	})

	describe("structural dispatch", () => {
		it("annotations don't block primitive dispatch", () => {
			const T = inferred({
				type: "string",
				title: "t",
				description: "d",
				default: "x",
				examples: ["a"],
				deprecated: true,
				readOnly: true,
				writeOnly: false,
				$comment: "c",
				$id: "https://example.com/s",
				$schema: "https://json-schema.org/draft/2020-12/schema",
				$anchor: "s",
				"x-unit": "ms"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("nullable false", () => {
			attest<string>(
				inferred({ type: "string", nullable: false })
			).type.toString.snap("string")
		})

		it("if with else only", () => {
			attest<string>(
				inferred({ type: "string", if: { minLength: 1 }, else: { const: "" } })
			).type.toString.snap("string")
		})

		it("if with then only on an object", () => {
			attest<object>(
				inferred({
					type: "object",
					if: { required: ["a"] },
					then: { required: ["b"] }
				})
			).type.toString.snap("object")
		})

		it("if then else on a primitive", () => {
			attest<"a" | "b">(
				inferred({
					type: "string",
					if: { minLength: 1 },
					then: { const: "a" },
					else: { const: "b" }
				})
			).type.toString.snap('"a" | "b"')
		})

		it("if then else on an object", () => {
			const T = inferred({
				type: "object",
				properties: { kind: { enum: ["a", "b"] } },
				required: ["kind"],
				if: { properties: { kind: { const: "a" } } },
				then: { properties: { a: { type: "string" } }, required: ["a"] },
				else: { properties: { b: { type: "number" } }, required: ["b"] }
			})
			attest<{ kind: "a" | "b"; a: string } | { kind: "a" | "b"; b: number }>(T)
				.type.toString.snap(`	| { kind: "a" | "b"; a: string }
	| { kind: "a" | "b"; b: number }`)
		})

		it("then and else are ignored without if on a typed schema", () => {
			attest<string>(
				inferred({ type: "string", then: { const: "a" }, else: { const: "b" } })
			).type.toString.snap("string")
		})

		it("then and else are ignored without if on an untyped schema", () => {
			attest<unknown>(
				inferred({ then: { type: "string" }, else: { type: "number" } })
			).type.toString.snap("unknown")
		})

		it("unknown keywords next to modifiers", () => {
			attest<string | null>(
				inferred({ type: "string", nullable: true, "x-internal": {} })
			).type.toString.snap("string | null")
		})

		it("mutable hand-written prefixItems", () => {
			attest<[string, number?]>(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" }]
					minItems: 1
					items: false
				}>()
			).type.toString.snap("[string, number?]")
		})

		it("interface-typed schema type", () => {
			attest<string>(inferType<StringSchemaInterface>()).type.toString.snap(
				"string"
			)
		})

		it("interface-typed schema value is valid", () => {
			const schema: StringSchemaInterface = { type: "string" }
			attest(() => inferred(schema)).type.errors.is("")
		})

		it("optional never keywords are unmodified", () => {
			attest<string>(
				inferType<{ type: "string"; const?: never; $ref?: never }>()
			).type.toString.snap("string")
		})

		it("optional composition keyword", () => {
			attest<string>(
				inferType<{
					type: "string"
					anyOf?: readonly { type: "string" }[]
				}>()
			).type.toString.snap("string")
		})

		it("optional const keyword", () => {
			attest<string>(
				inferType<{ type: "string"; const?: "a" }>()
			).type.toString.snap("string")
		})

		it("optional $ref keyword", () => {
			attest<string>(
				inferType<{
					type: "string"
					$ref?: "#/$defs/a"
					$defs: { a: { const: "a" } }
				}>()
			).type.toString.snap("string")
		})
	})

	describe("widened schemas", () => {
		it("widened type name", () => {
			attest<unknown>(inferType<{ type: string }>()).type.toString.snap(
				"unknown"
			)
		})

		it("type name union", () => {
			attest<string | number>(
				inferType<{ type: "string" | "number" }>()
			).type.toString.snap("string | number")
		})

		it("widened const", () => {
			attest<string>(inferType<{ const: string }>()).type.toString.snap(
				"string"
			)
		})

		it("widened enum", () => {
			attest<string>(inferType<{ enum: string[] }>()).type.toString.snap(
				"string"
			)
			attest<string>(
				inferType<{ type: "string"; enum: (string | number)[] }>()
			).type.toString.snap("string")
		})

		it("widened $ref", () => {
			const ref: string = "#/$defs/a"
			attest<unknown>(
				inferred({ $defs: { a: { type: "string" } }, $ref: ref })
			).type.toString.snap("unknown")
		})

		it("widened template literal $ref is valid", () => {
			const name: string = "a"
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					$ref: `#/$defs/${name}`
				})
			).type.errors.is("")
		})

		it("widened count", () => {
			const n: number = 1
			attest<string>(
				inferred({ type: "string", minLength: n, maxLength: n })
			).type.toString.snap("string")
		})

		it("widened required with properties", () => {
			const required: string[] = ["a"]
			attest<{ a?: string }>(
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					required
				})
			).type.toString.snap("{ a?: string }")
		})

		it("widened required without properties", () => {
			const required: string[] = ["a"]
			attest<object>(inferred({ type: "object", required })).type.toString.snap(
				"object"
			)
		})

		it("widened minItems", () => {
			const minItems: number = 1
			attest<[string?, number?, ...unknown[]]>(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }, { type: "number" }],
					minItems
				})
			).type.toString.snap("[string?, number?, ...unknown[]]")
		})

		it("widened nullable", () => {
			const nullable = true as boolean
			attest<string | null>(
				inferred({ type: "string", nullable })
			).type.toString.snap("string | null")
		})

		it("widened items boolean", () => {
			attest<[string?, ...unknown[]] | [string?]>(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }]
					items: boolean
				}>()
			).type.toString.snap("[string?] | [string?, ...unknown[]]")
		})

		it("widened prefixItems", () => {
			attest<unknown[]>(
				inferType<{ type: "array"; prefixItems: { type: "string" }[] }>()
			).type.toString.snap("unknown[]")
		})

		it("widened prefixItems with items false", () => {
			attest<string[]>(
				inferType<{
					type: "array"
					prefixItems: { type: "string" }[]
					items: false
				}>()
			).type.toString.snap("string[]")
		})

		it("widened properties record", () => {
			const T = inferType<{
				type: "object"
				properties: Record<string, { type: "string" }>
			}>()
			attest(T.a).type.toString.snap("unknown")
		})

		it("widened properties record with required", () => {
			attest<{ [k: string]: unknown; a: unknown }>(
				inferType<{
					type: "object"
					properties: Record<string, { type: "string" }>
					required: ["a"]
				}>()
			).type.toString.snap("{ [x: string]: unknown; a: unknown }")
		})

		it("Record<string, unknown>", () => {
			attest<unknown>(inferType<Record<string, unknown>>()).type.toString.snap(
				"unknown"
			)
		})

		it("Record<string, any>", () => {
			attest<unknown>(inferType<Record<string, any>>()).type.toString.snap(
				"unknown"
			)
		})

		it("JSONSchema7 infers unknown", () => {
			attest<unknown>(inferType<JSONSchema7>()).type.toString.snap("unknown")
		})

		it("JSONSchema7 value is valid", () => {
			const schema: JSONSchema7 = { type: "string" }
			attest(() => inferred(schema)).type.errors.is("")
		})

		it("nested JSONSchema7", () => {
			const T = inferType<{
				type: "object"
				properties: { a: JSONSchema7 }
			}>()
			attest<unknown>(T.a).type.toString.snap("unknown")
		})

		it("nested JSONSchema7 values are valid", () => {
			type s = {
				type: "object"
				properties: { a: JSONSchema7 }
				items: JSONSchema7
				anyOf: [JSONSchema7, { type: "string" }]
				not: JSONSchema7
				dependencies: { a: JSONSchema7 }
			}
			attest<true, s extends jsonSchema.validate<s> ? true : false>()
		})

		it("arktype JsonSchema subtypes infer their family", () => {
			attest<string>(inferType<JsonSchema.String>()).type.toString.snap(
				"string"
			)
			attest<number>(inferType<JsonSchema.Numeric>()).type.toString.snap(
				"number"
			)
			attest<object>(inferType<JsonSchema.Object>()).type.toString.snap(
				"object"
			)
			attest<unknown[]>(inferType<JsonSchema.Array>()).type.toString.snap(
				"unknown[]"
			)
			attest<unknown>(inferType<JsonSchema.Ref>()).type.toString.snap("unknown")
			attest<unknown>(inferType<JsonSchema.Const>()).type.toString.snap(
				"unknown"
			)
			attest<unknown>(inferType<JsonSchema.Enum>()).type.toString.snap(
				"unknown"
			)
			attest<unknown>(inferType<JsonSchema.Union>()).type.toString.snap(
				"unknown"
			)
		})

		it("arktype JsonSchema subtype values are valid", () => {
			const obj: JsonSchema.Object = { type: "object" }
			attest(() => inferred(obj)).type.errors.is("")
			const arr: JsonSchema.Array = { type: "array" }
			attest(() => inferred(arr)).type.errors.is("")
			const num: JsonSchema.Numeric = { type: "number" }
			attest(() => inferred(num)).type.errors.is("")
		})

		it("nested JsonSchema property", () => {
			const T = inferType<{
				type: "object"
				properties: { a: JsonSchema }
			}>()
			attest<unknown>(T.a).type.toString.snap("unknown")
		})

		it("nested JsonSchema branches", () => {
			attest<unknown>(
				inferType<{ anyOf: readonly JsonSchema[] }>()
			).type.toString.snap("unknown")
		})

		it("nested JsonSchema properties record", () => {
			attest<{ [k: string]: unknown }>(
				inferType<{
					type: "object"
					properties: Record<string, JsonSchema>
				}>()
			).type.toString.snap("{ [x: string]: unknown }")
		})

		it("nested any", () => {
			const T = inferType<{ type: "object"; properties: { a: any } }>()
			attest<0 extends 1 & typeof T.a ? true : false>(true)
			attest(T.a).type.toString.snap("any")
		})

		it("nested any items", () => {
			attest<any[]>(
				inferType<{ type: "array"; items: any }>()
			).type.toString.snap("any[]")
		})

		it("any type name", () => {
			attest<unknown>(inferType<{ type: any }>()).type.toString.snap("unknown")
		})

		it("any anyOf", () => {
			attest<unknown>(inferType<{ anyOf: any }>()).type.toString.snap("unknown")
		})

		it("nested never", () => {
			const T = inferType<{ type: "object"; properties: { a: never } }>()
			attest<{ a?: never }>(T)
			attest<undefined>(T.a).type.toString.snap("undefined")
		})

		it("nested unknown", () => {
			const T = inferType<{ type: "object"; properties: { a: unknown } }>()
			attest<{ a?: unknown }>(T)
			attest<unknown>(T.a).type.toString.snap("unknown")
		})
	})

	describe("unions", () => {
		it("union of schemas", () => {
			attest<string | { a: number }>(
				inferType<
					| { type: "string" }
					| {
							type: "object"
							properties: { a: { type: "number" } }
							required: ["a"]
					  }
				>()
			).type.toString.snap("string | { a: number }")
		})

		it("union with boolean schema", () => {
			attest<unknown>(
				inferType<true | { type: "string" }>()
			).type.toString.snap("unknown")
			attest<string>(
				inferType<false | { type: "string" }>()
			).type.toString.snap("string")
		})

		it("union members are their own roots for pointers", () => {
			attest(
				inferType<
					| {
							type: "object"
							properties: {
								a: { $ref: "#/properties/b" }
								b: { type: "boolean" }
							}
					  }
					| { type: "string"; properties: { b: { type: "number" } } }
				>()
			).type.toString.snap("string | { a?: boolean; b?: boolean }")
		})

		it("conditional schema argument", () => {
			const useString: boolean = true
			const T = inferred(
				useString ?
					{ $defs: { x: { type: "string" } }, $ref: "#/$defs/x" }
				:	{ type: "number" }
			)
			attest<string | number>(T).type.toString.snap("string | number")
		})

		it("anyOf intersected with oneOf", () => {
			attest<"a" | 1>(
				inferred({
					anyOf: [{ type: "string" }, { type: "number" }],
					oneOf: [{ const: "a" }, { const: 1 }, { const: true }]
				})
			).type.toString.snap('1 | "a"')
		})

		it("type list intersected with anyOf", () => {
			attest<"a" | null>(
				inferred({
					type: ["string", "null"],
					anyOf: [{ const: "a" }, { type: "null" }, { const: 1 }]
				})
			).type.toString.snap('"a" | null')
		})

		it("type list with object and array families", () => {
			const T = inferred({
				type: ["array", "object", "null"],
				items: { type: "string" },
				properties: { a: { type: "number" } },
				required: ["a"]
			})
			attest<string[] | { a: number } | null>(T).type.toString.snap(
				"{ a: number } | string[] | null"
			)
		})

		it("every type name", () => {
			attest<string | number | boolean | object | unknown[] | null>(
				inferred({
					type: [
						"string",
						"number",
						"integer",
						"boolean",
						"object",
						"array",
						"null"
					]
				})
			).type.toString.snap(`	| string
	| number
	| boolean
	| object
	| unknown[]
	| null`)
		})

		it("integer and number", () => {
			attest<number>(
				inferred({ type: ["integer", "number"] })
			).type.toString.snap("number")
		})

		it("empty type list", () => {
			// @ts-expect-error
			attest<never>(inferred({ type: [] })).type.toString.snap("never")
		})

		it("nullable object", () => {
			attest<{ a: string } | null>(
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					required: ["a"],
					nullable: true
				})
			).type.toString.snap("{ a: string } | null")
		})

		it("discriminated oneOf on a base object", () => {
			attest<{ kind?: "a" } | { kind?: "b" }>(
				inferred({
					type: "object",
					properties: { kind: { type: "string" } },
					oneOf: [
						{ properties: { kind: { const: "a" } } },
						{ properties: { kind: { const: "b" } } }
					]
				})
			).type.toString.snap('{ kind?: "a" } | { kind?: "b" }')
		})
	})

	describe("part intersection", () => {
		it("allOf alone", () => {
			attest<{ a: string }>(
				inferred({
					allOf: [
						{ type: "object", properties: { a: { type: "string" } } },
						{ required: ["a"] }
					]
				})
			).type.toString.snap("{ a: string }")
		})

		it("if then else alone", () => {
			attest<{ a: string } | null>(
				inferred({
					if: { type: "object" },
					then: {
						type: "object",
						properties: { a: { type: "string" } },
						required: ["a"]
					},
					else: { type: "null" }
				})
			).type.toString.snap("{ a: string } | null")
		})

		it("const with matching type", () => {
			attest<"a">(inferred({ type: "string", const: "a" })).type.toString.snap(
				'"a"'
			)
		})

		it("enum filtered by type", () => {
			attest<{ readonly a: 1 }>(
				inferred({ type: "object", enum: [{ a: 1 }, null, "a"] })
			).type.toString.snap("{ readonly a: 1 }")
		})

		it("integer type with enum", () => {
			attest<1 | 2>(
				inferred({ type: "integer", enum: [1, 2, "3"] })
			).type.toString.snap("1 | 2")
		})

		it("empty enum", () => {
			attest<never>(inferred({ enum: [] })).type.toString.snap("never")
			attest<never>(inferred({ type: "string", enum: [] })).type.toString.snap(
				"never"
			)
		})

		it("empty anyOf", () => {
			// @ts-expect-error
			attest<never>(inferred({ type: "string", anyOf: [] })).type.toString.snap(
				"never"
			)
		})

		it("empty allOf", () => {
			// @ts-expect-error
			attest<unknown>(inferred({ allOf: [] })).type.toString.snap("unknown")
		})

		it("false branches", () => {
			attest<never>(
				inferred({ allOf: [{ type: "string" }, false] })
			).type.toString.snap("never")
			attest<string>(
				inferred({ anyOf: [{ type: "string" }, false] })
			).type.toString.snap("string")
		})

		it("true branches", () => {
			attest<string>(
				inferred({ allOf: [{ type: "string" }, true] })
			).type.toString.snap("string")
			attest<unknown>(
				inferred({ anyOf: [{ type: "string" }, true] })
			).type.toString.snap("unknown")
		})

		it("$ref with type", () => {
			attest<"a">(
				inferred({
					$defs: { a: { enum: ["a", 1] } },
					$ref: "#/$defs/a",
					type: "string"
				})
			).type.toString.snap('"a"')
		})

		it("$ref extending a base object", () => {
			attest<{ name: string; id: string }>(
				inferred({
					$defs: {
						base: {
							type: "object",
							properties: { id: { type: "string" } },
							required: ["id"]
						}
					},
					$ref: "#/$defs/base",
					properties: { name: { type: "string" } },
					required: ["name"]
				})
			).type.toString.snap("{ name: string; id: string }")
		})

		it("enum with nullable", () => {
			attest<"a" | null>(
				inferred({ enum: ["a"], nullable: true })
			).type.toString.snap('"a" | null')
		})

		it("every part kind at once", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				$ref: "#/$defs/base",
				anyOf: [{ required: ["b"] }, { required: ["c"] }],
				allOf: [{ properties: { d: { type: "number" } } }],
				if: { required: ["a"] },
				then: { required: ["e"] },
				else: { required: ["f"] },
				$defs: {
					base: { type: "object", properties: { z: { type: "boolean" } } }
				}
			})
			type Base = { a: string; z?: boolean; d?: number }
			attest<
				| (Base & { b: unknown; e: unknown })
				| (Base & { b: unknown; f: unknown })
				| (Base & { c: unknown; e: unknown })
				| (Base & { c: unknown; f: unknown })
			>(T)
		})
	})

	describe("flatten", () => {
		it("bare object stays object", () => {
			attest<object>(
				inferred({ type: "object", allOf: [{ title: "x" }] })
			).type.toString.snap("object")
			attest<object>(
				inferred({ allOf: [{ type: "object" }, { type: "object" }] })
			).type.toString.snap("object")
		})

		it("keeps unknown values", () => {
			attest<{ a: unknown }>(
				inferred({
					type: "object",
					allOf: [{ properties: { a: true } }, { required: ["a"] }]
				})
			).type.toString.snap("{ a: unknown }")
		})

		it("keeps null values", () => {
			attest<{ a: null }>(
				inferred({
					type: "object",
					allOf: [{ properties: { a: { type: "null" } } }, { required: ["a"] }]
				})
			).type.toString.snap("{ a: null }")
		})

		it("keeps never values", () => {
			attest<{ a: never }>(
				inferred({
					type: "object",
					allOf: [{ properties: { a: false } }, { required: ["a"] }]
				})
			).type.toString.snap("{ a: never }")
		})

		it("keeps optional unknown values", () => {
			attest<{ a?: unknown }>(
				inferred({ allOf: [{ properties: { a: true } }, { type: "object" }] })
			).type.toString.snap("{ a?: unknown }")
		})

		it("keeps index signatures", () => {
			attest<{ [x: string]: string; a: string }>(
				inferred({
					type: "object",
					allOf: [
						{ additionalProperties: { type: "string" } },
						{ required: ["a"] }
					]
				})
			).type.toString.snap("{ [x: string]: string; a: string }")
		})

		it("primitive and object", () => {
			attest<never>(
				inferred({ allOf: [{ type: "string" }, { type: "object" }] })
			).type.toString.snap("never")
		})

		it("array with constraints", () => {
			attest<string[]>(
				inferred({
					type: "array",
					items: { type: "string" },
					allOf: [{ minItems: 1 }]
				})
			).type.toString.snap("string[]")
		})

		it("array with array", () => {
			attest<string[]>(
				inferred({
					type: "array",
					items: { type: "string" },
					allOf: [{ type: "array" }]
				})
			).type.toString.snap("string[]")
		})

		it("tuple with array", () => {
			attest<[string?, ...unknown[]]>(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }],
					$ref: "#/$defs/list",
					$defs: { list: { type: "array" } }
				})
			).type.toString.snap("[string?, ...unknown[]]")
		})

		it("array const", () => {
			attest<readonly [1, 2]>(
				inferred({ type: "array", const: [1, 2] })
			).type.toString.snap("readonly [1, 2]")
		})

		it("array anyOf", () => {
			attest<string[] | number[]>(
				inferred({
					type: "array",
					anyOf: [{ items: { type: "string" } }, { items: { type: "number" } }]
				})
			).type.toString.snap("string[] | number[]")
		})

		it("array and object", () => {
			attest<never>(
				inferred({ type: "array", allOf: [{ type: "object" }] })
			).type.toString.snap("never")
		})
	})

	describe("not", () => {
		it("excludes type list", () => {
			attest<boolean>(
				inferred({
					type: ["string", "number", "boolean"],
					not: { type: ["string", "number"] }
				})
			).type.toString.snap("boolean")
		})

		it("excludes const", () => {
			attest<"a" | "c">(
				inferred({ enum: ["a", "b", "c"], not: { const: "b" } })
			).type.toString.snap('"a" | "c"')
		})

		it("excludes enum", () => {
			attest<"c">(
				inferred({ enum: ["a", "b", "c"], not: { enum: ["a", "b"] } })
			).type.toString.snap('"c"')
		})

		it("excludes typed const", () => {
			attest<"b">(
				inferred({ enum: ["a", "b"], not: { type: "string", const: "a" } })
			).type.toString.snap('"b"')
		})

		it("can't exclude a literal from its base", () => {
			attest<number>(
				inferred({ type: "number", not: { const: 1 } })
			).type.toString.snap("number")
		})

		it("keeps object enum members, which aren't exact", () => {
			attest<{ readonly a: 1 } | { readonly a: 2 }>(
				inferred({ enum: [{ a: 1 }, { a: 2 }], not: { const: { a: 1 } } })
			).type.toString.snap("{ readonly a: 1 } | { readonly a: 2 }")
		})

		it("empty enum excludes nothing", () => {
			attest<string>(
				inferred({ type: "string", not: { enum: [] } })
			).type.toString.snap("string")
		})

		it("empty type list excludes nothing", () => {
			attest<string>(
				// @ts-expect-error
				inferred({ type: "string", not: { type: [] } })
			).type.toString.snap("string")
		})

		it("not true and not empty", () => {
			attest<never>(inferred({ type: "string", not: true })).type.toString.snap(
				"never"
			)
			attest<never>(inferred({ type: "string", not: {} })).type.toString.snap(
				"never"
			)
		})

		it("not false", () => {
			attest<string>(
				inferred({ type: "string", not: false })
			).type.toString.snap("string")
		})

		it("not with annotations", () => {
			attest<string>(
				inferred({
					type: ["string", "null"],
					not: { type: "null", title: "no nulls" }
				})
			).type.toString.snap("string")
		})

		it("not with a $ref is best effort", () => {
			attest<string | null>(
				inferred({
					$defs: { n: { type: "null" } },
					type: ["string", "null"],
					not: { $ref: "#/$defs/n" }
				})
			).type.toString.snap("string | null")
		})

		it("not with nullable", () => {
			attest<string | null>(
				inferred({ type: "string", nullable: true, not: { const: "" } })
			).type.toString.snap("string | null")
		})

		it("not integer on integer", () => {
			attest<never>(
				inferred({ type: "integer", not: { type: "number" } })
			).type.toString.snap("never")
		})

		it("not integer on number", () => {
			attest<number>(
				inferred({ type: "number", not: { type: "integer" } })
			).type.toString.snap("number")
		})

		it("not integer on an enum", () => {
			attest<1.5 | 2>(
				inferred({ enum: [1.5, 2], not: { type: "integer" } })
			).type.toString.snap("2 | 1.5")
		})

		it("not object keeps arrays", () => {
			attest<unknown[] | null>(
				inferred({ type: ["array", "null"], not: { type: "object" } })
			).type.toString.snap("unknown[] | null")
		})

		it("not object keeps tuples", () => {
			attest<string | number | boolean | [string?, ...unknown[]] | null>(
				inferred({ prefixItems: [{ type: "string" }], not: { type: "object" } })
			).type.toString.snap(`	| string
	| number
	| boolean
	| [string?, ...unknown[]]
	| null`)
		})

		it("not array keeps objects", () => {
			attest<{ a: string }>(
				inferred({
					type: ["array", "object"],
					properties: { a: { type: "string" } },
					required: ["a"],
					not: { type: "array" }
				})
			).type.toString.snap("{ a: string }")
		})
	})

	describe("objects", () => {
		it("required numeric property keys infer", () => {
			attest<{ 1: string }>(
				inferType<{
					type: "object"
					properties: { 1: { type: "string" } }
					required: ["1"]
				}>()
			).type.toString.snap("{ 1: string }")
		})

		it("required numeric property keys are valid", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { 1: { type: "string" } },
					required: ["1"]
				})
			).type.errors.is("")
		})

		it("keys that look like keywords", () => {
			const T = inferred({
				type: "object",
				properties: {
					type: { type: "string" },
					$ref: { type: "number" },
					properties: { type: "boolean" },
					required: { type: "null" }
				},
				required: ["type", "$ref"]
			})
			attest<{
				type: string
				$ref: number
				properties?: boolean
				required?: null
			}>(T).type.toString.snap(`{
	type: string
	$ref: number
	properties?: boolean
	required?: null
}`)
		})

		it("keys that need quotes", () => {
			const T = inferred({
				type: "object",
				properties: {
					"a-b": { type: "string" },
					"a b": { type: "number" },
					"": { type: "null" },
					constructor: { type: "boolean" }
				},
				required: ["a-b"]
			})
			attest<{
				"a-b": string
				"a b"?: number
				""?: null
				constructor?: boolean
			}>(T).type.toString.snap(`{
	"a-b": string
	"a b"?: number
	""?: null
	constructor?: boolean
}`)
		})

		it("required keys keep property order", () => {
			attest<{ a?: string; b: number; c?: boolean; d: null }>(
				inferred({
					type: "object",
					properties: {
						a: { type: "string" },
						b: { type: "number" },
						c: { type: "boolean" },
						d: { type: "null" }
					},
					required: ["d", "b"]
				})
			).type.toString.snap("{ a?: string; b: number; c?: boolean; d: null }")
		})

		it("every key required keeps property order", () => {
			attest<{ b: string; a: number }>(
				inferred({
					type: "object",
					properties: { b: { type: "string" }, a: { type: "number" } },
					required: ["a", "b"]
				})
			).type.toString.snap("{ b: string; a: number }")
		})

		it("required keys missing from properties go last", () => {
			attest<{ a?: string; b: number; z: unknown }>(
				inferType<{
					type: "object"
					properties: { a: { type: "string" }; b: { type: "number" } }
					required: ["b", "z"]
				}>()
			).type.toString.snap("{ a?: string; b: number; z: unknown }")
		})

		it("duplicate required keys", () => {
			attest<{ a: string }>(
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					required: ["a", "a"]
				})
			).type.toString.snap("{ a: string }")
		})

		it("empty required", () => {
			attest<{ a?: string }>(
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					required: []
				})
			).type.toString.snap("{ a?: string }")
		})

		it("required false property", () => {
			attest<{ a: never }>(
				inferred({
					type: "object",
					properties: { a: false },
					required: ["a"]
				})
			).type.toString.snap("{ a: never }")
		})

		it("required key absent from properties uses additionalProperties", () => {
			attest(
				inferType<{
					type: "object"
					required: ["a"]
					additionalProperties: { type: "number" }
				}>()
			).type.toString.snap("{ [x: string]: number; a: number }")
		})

		it("additionalProperties empty schema", () => {
			attest<{ [k: string]: unknown }>(
				inferred({ type: "object", additionalProperties: {} })
			).type.toString.snap("{ [x: string]: unknown }")
		})

		it("additionalProperties with properties and required", () => {
			attest<{
				[k: string]: string | number | boolean
				a: string
				b?: number
			}>(
				inferred({
					type: "object",
					properties: { a: { type: "string" }, b: { type: "number" } },
					required: ["a"],
					additionalProperties: { type: "boolean" }
				})
			).type.toString.snap(`{
	[x: string]: string | number | boolean
	a: string
	b?: number
}`)
		})

		it("recursive additionalProperties", () => {
			type Tree = { [k: string]: Tree }
			attest<Tree>(
				inferred({ type: "object", additionalProperties: { $ref: "#" } })
			)
		})

		it("patternProperties with closed additionalProperties", () => {
			attest<{ [k: string]: string | number | boolean; a?: boolean }>(
				inferred({
					type: "object",
					properties: { a: { type: "boolean" } },
					patternProperties: {
						"^s-": { type: "string" },
						"^n-": { type: "number" }
					},
					additionalProperties: false
				})
			).type.toString.snap(`{
	[x: string]: string | number | boolean
	a?: boolean
}`)
		})

		it("patternProperties with additionalProperties schema", () => {
			attest<{ [k: string]: string | number }>(
				inferred({
					type: "object",
					patternProperties: { "^s-": { type: "string" } },
					additionalProperties: { type: "number" }
				})
			).type.toString.snap("{ [x: string]: string | number }")
		})

		it("empty patternProperties", () => {
			attest<object>(
				inferred({ type: "object", patternProperties: {} })
			).type.toString.snap("object")
		})

		it("false patternProperties", () => {
			attest<object>(
				inferred({ type: "object", patternProperties: { "^x-": false } })
			).type.toString.snap("object")
		})

		it("patternProperties with additionalProperties absent", () => {
			attest<{ [k: string]: unknown }>(
				inferred({
					type: "object",
					patternProperties: { "^x-": { type: "string" } }
				})
			).type.toString.snap("{ [x: string]: unknown }")
		})

		it("implied by patternProperties", () => {
			attest<
				string | number | boolean | unknown[] | { [x: string]: string } | null
			>(
				inferred({
					patternProperties: { "^x-": { type: "string" } },
					additionalProperties: false
				})
			).type.toString.snap(`	| string
	| number
	| boolean
	| unknown[]
	| { [x: string]: string }
	| null`)
		})

		it("implied by additionalProperties", () => {
			attest<
				string | number | boolean | unknown[] | { [x: string]: number } | null
			>(inferred({ additionalProperties: { type: "number" } })).type.toString
				.snap(`	| string
	| number
	| boolean
	| unknown[]
	| { [x: string]: number }
	| null`)
			attest<string | number | boolean | object | unknown[] | null>(
				inferred({ additionalProperties: false })
			).type.toString.snap(`	| string
	| number
	| boolean
	| object
	| unknown[]
	| null`)
		})

		it("implied by required", () => {
			attest<
				| string
				| number
				| boolean
				| unknown[]
				| { a: unknown; b: unknown }
				| null
			>(inferred({ required: ["a", "b"] })).type.toString.snap(`	| string
	| number
	| boolean
	| unknown[]
	| { a: unknown; b: unknown }
	| null`)
		})

		it("object keywords don't apply to other families", () => {
			attest<string>(
				inferred({
					type: "string",
					properties: { a: { type: "number" } },
					required: ["a"]
				})
			).type.toString.snap("string")
		})

		it("no effect keywords", () => {
			attest<{ a: string }>(
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					propertyNames: { pattern: "^[a-z]+$" },
					minProperties: 1,
					maxProperties: 3,
					dependentRequired: { a: ["b"] },
					dependentSchemas: { a: { required: ["b"] } },
					unevaluatedProperties: false,
					required: ["a"]
				})
			).type.toString.snap("{ a: string }")
		})
	})

	describe("arrays", () => {
		it("minItems 0", () => {
			attest<[string?, number?]>(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }, { type: "number" }],
					minItems: 0,
					items: false
				})
			).type.toString.snap("[string?, number?]")
		})

		it("minItems equal to prefix length", () => {
			attest<[string, number]>(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }, { type: "number" }],
					minItems: 2,
					items: false
				})
			).type.toString.snap("[string, number]")
		})

		it("minItems beyond prefix length", () => {
			attest<[string, number, ...boolean[]]>(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }, { type: "number" }],
					minItems: 5,
					items: { type: "boolean" }
				})
			).type.toString.snap("[string, number, ...boolean[]]")
		})

		it("minItems union", () => {
			attest<[string, number?, boolean?] | [string, number, boolean?]>(
				inferType<{
					type: "array"
					prefixItems: [
						{ type: "string" },
						{ type: "number" },
						{ type: "boolean" }
					]
					minItems: 1 | 2
					items: false
				}>()
			).type.toString.snap(`	| [string, number?, boolean?]
	| [string, number, boolean?]`)
		})

		it("minItems 100 of 120", () => {
			type T = jsonSchema.infer<{
				type: "array"
				prefixItems: [
					...array.repeat<{ type: "string" }, 100>,
					...array.repeat<{ type: "number" }, 20>
				]
				minItems: 100
				items: false
			}>
			attest<true, array.repeat<string, 100> extends T ? true : false>()
			attest<false, array.repeat<string, 99> extends T ? true : false>()
			attest<string, T[99]>()
			attest<number | undefined, T[119]>()
		})

		it("minItems 105 of 110", () => {
			type T = jsonSchema.infer<{
				type: "array"
				prefixItems: [
					...array.repeat<{ type: "string" }, 105>,
					...array.repeat<{ type: "number" }, 5>
				]
				minItems: 105
				items: { type: "boolean" }
			}>
			attest<
				[
					...array.repeat<string, 105>,
					number?,
					number?,
					number?,
					number?,
					number?,
					...boolean[]
				],
				T
			>()
		})

		it("empty prefixItems", () => {
			attest<unknown[]>(
				// @ts-expect-error
				inferred({ type: "array", prefixItems: [] })
			).type.toString.snap("unknown[]")
			attest<[]>(
				// @ts-expect-error
				inferred({ type: "array", prefixItems: [], items: false })
			).type.toString.snap("[]")
		})

		it("prefixItems with items true", () => {
			attest<[string?, ...unknown[]]>(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }],
					items: true
				})
			).type.toString.snap("[string?, ...unknown[]]")
		})

		it("prefixItems with draft-07 items array is open", () => {
			attest<[string?, ...unknown[]]>(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }],
					items: [{ type: "number" }]
				})
			).type.toString.snap("[string?, ...unknown[]]")
		})

		it("draft-07 items with additionalItems true", () => {
			attest<[string, ...unknown[]]>(
				inferred({
					type: "array",
					items: [{ type: "string" }],
					minItems: 1,
					additionalItems: true
				})
			).type.toString.snap("[string, ...unknown[]]")
		})

		it("draft-07 items with minItems and closed", () => {
			attest<[string, number?]>(
				inferred({
					type: "array",
					items: [{ type: "string" }, { type: "number" }],
					minItems: 1,
					additionalItems: false
				})
			).type.toString.snap("[string, number?]")
		})

		it("draft-07 items with minItems is open", () => {
			attest<[string, number?, ...unknown[]]>(
				inferred({
					type: "array",
					items: [{ type: "string" }, { type: "number" }],
					minItems: 1
				})
			).type.toString.snap("[string, number?, ...unknown[]]")
		})

		it("empty draft-07 items", () => {
			attest<[]>(
				// @ts-expect-error
				inferred({ type: "array", items: [], additionalItems: false })
			).type.toString.snap("[]")
		})

		it("additionalItems without items has no effect", () => {
			attest<unknown[]>(
				inferred({ type: "array", additionalItems: { type: "string" } })
			).type.toString.snap("unknown[]")
		})

		it("additionalItems with schema items has no effect", () => {
			attest<string[]>(
				inferType<{
					type: "array"
					items: { type: "string" }
					additionalItems: { type: "number" }
				}>()
			).type.toString.snap("string[]")
		})

		it("items empty schema", () => {
			attest<unknown[]>(
				inferred({ type: "array", items: {} })
			).type.toString.snap("unknown[]")
		})

		it("array keywords don't apply to other families", () => {
			attest<number>(
				inferred({ type: "number", items: { type: "string" }, minItems: 1 })
			).type.toString.snap("number")
		})
	})

	describe("ref resolution", () => {
		it("boolean definitions", () => {
			attest<never>(
				inferred({ $defs: { a: false }, $ref: "#/$defs/a" })
			).type.toString.snap("never")
			attest<{ x: unknown }>(
				inferred({
					$defs: { a: true },
					type: "object",
					properties: { x: { $ref: "#/$defs/a" } },
					required: ["x"]
				})
			).type.toString.snap("{ x: unknown }")
		})

		it("pointer into prefixItems", () => {
			attest<[string, string]>(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }, { $ref: "#/prefixItems/0" }],
					minItems: 2,
					items: false
				})
			).type.toString.snap("[string, string]")
		})

		it("pointer into a definition", () => {
			attest<boolean>(
				inferred({
					$defs: {
						a: { type: "object", properties: { b: { type: "boolean" } } }
					},
					$ref: "#/$defs/a/properties/b"
				})
			).type.toString.snap("boolean")
		})

		it("pointer to an empty key", () => {
			attest<string>(
				inferred({ $defs: { "": { type: "string" } }, $ref: "#/$defs/" })
			).type.toString.snap("string")
		})

		it("escaped tilde", () => {
			attest<boolean>(
				inferred({
					$defs: { "a~b": { type: "boolean" } },
					$ref: "#/$defs/a~0b"
				})
			).type.toString.snap("boolean")
		})

		it("escaped slash in definitions", () => {
			attest<null>(
				inferred({
					definitions: { "a/b": { type: "null" } },
					$ref: "#/definitions/a~1b"
				})
			).type.toString.snap("null")
		})

		it("escaped slash then zero", () => {
			attest<string>(
				inferred({ $defs: { "/0": { type: "string" } }, $ref: "#/$defs/~10" })
			).type.toString.snap("string")
		})

		it("an escape sequence in a definition name is unescaped", () => {
			attest<unknown>(
				inferType<{
					$defs: { "a~1b": { type: "string" } }
					$ref: "#/$defs/a~1b"
				}>()
			).type.toString.snap("unknown")
		})

		it("a definition name containing an escape sequence must be escaped", () => {
			attest(() =>
				inferred({
					$defs: { "a~1b": { type: "string" } },
					// @ts-expect-error
					$ref: "#/$defs/a~1b"
				})
			).type.errors.snap(
				'Type \'"#/$defs/a~1b"\' is not assignable to type \'"#" | "#/$defs/a~01b"\'. Did you mean \'"#/$defs/a~01b"\'?'
			)
		})

		it("a definition name containing a slash must be escaped", () => {
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

		it("escaped tilde followed by one", () => {
			attest<string>(
				inferType<{
					$defs: { "a~1b": { type: "string" }; "a/b": { type: "number" } }
					$ref: "#/$defs/a~01b"
				}>()
			).type.toString.snap("string")
		})

		it("numeric definition name", () => {
			attest(() =>
				inferred({
					$defs: { 1: { type: "string" } },
					$ref: "#/$defs/1"
				})
			).type.errors.is("")
		})

		it("pointer to a numeric property", () => {
			const T = inferType<{
				type: "object"
				properties: { 1: { type: "string" }; b: { $ref: "#/properties/1" } }
			}>()
			attest<string | undefined>(T.b).type.toString.snap("string | undefined")
		})

		it("$defs and definitions with the same name", () => {
			attest<[string, number]>(
				inferred({
					$defs: { a: { type: "string" } },
					definitions: { a: { type: "number" } },
					type: "array",
					prefixItems: [{ $ref: "#/$defs/a" }, { $ref: "#/definitions/a" }],
					minItems: 2,
					items: false
				})
			).type.toString.snap("[string, number]")
		})

		it("pointer into a definition's escaped property", () => {
			attest<boolean>(
				inferred({
					$defs: {
						a: { type: "object", properties: { "b/c": { type: "boolean" } } }
					},
					$ref: "#/$defs/a/properties/b~1c"
				})
			).type.toString.snap("boolean")
		})

		it("anchor ref is best effort", () => {
			attest<unknown>(
				inferred({ $defs: { a: { $anchor: "a", type: "string" } }, $ref: "#a" })
			).type.toString.snap("unknown")
		})

		it("relative ref is best effort", () => {
			attest<unknown>(
				inferred({ $ref: "other.json#/$defs/a" })
			).type.toString.snap("unknown")
		})

		it("ref with nullable", () => {
			attest<string | null>(
				inferred({
					$defs: { a: { type: "string" } },
					$ref: "#/$defs/a",
					nullable: true
				})
			).type.toString.snap("string | null")
		})

		it("ref with not", () => {
			attest<string>(
				inferred({
					$defs: { a: { type: ["string", "null"] } },
					$ref: "#/$defs/a",
					not: { type: "null" }
				})
			).type.toString.snap("string")
		})

		it("self ref through a definition", () => {
			attest<unknown>(
				inferred({ $defs: { a: { $ref: "#/$defs/a" } }, $ref: "#/$defs/a" })
			).type.toString.snap("unknown")
		})

		it("ref to root through a definition", () => {
			attest<unknown>(
				inferred({ $defs: { a: { $ref: "#" } }, $ref: "#/$defs/a" })
			).type.toString.snap("unknown")
		})

		it("not of root", () => {
			attest<unknown>(inferred({ not: { $ref: "#" } })).type.toString.snap(
				"unknown"
			)
		})

		it("shallow cycle through allOf", () => {
			const T = inferred({
				$defs: { a: { allOf: [{ $ref: "#/$defs/a" }] } },
				$ref: "#/$defs/a"
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("shallow mutual cycle through oneOf", () => {
			const T = inferred({
				$defs: {
					a: { oneOf: [{ $ref: "#/$defs/b" }, { type: "string" }] },
					b: { oneOf: [{ $ref: "#/$defs/a" }, { type: "number" }] }
				},
				$ref: "#/$defs/a"
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("shallow cycle through then", () => {
			const T = inferred({
				if: { type: "string" },
				then: { $ref: "#" },
				else: { type: "null" }
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("root extending itself through allOf", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				allOf: [{ $ref: "#" }]
			})
			attest<{ a?: string }>(T).type.toString.snap("{ a?: string }")
		})
	})

	describe("count validation", () => {
		it("zero and negative zero", () => {
			attest<string>(
				inferred({ type: "string", minLength: 0, maxLength: -0 })
			).type.toString.snap("string")
		})

		it("integer in exponent notation", () => {
			attest<string>(
				inferred({ type: "string", minLength: 1e3, maxLength: 1e21 })
			).type.toString.snap("string")
		})

		it("integer with a fractional zero", () => {
			attest<string>(
				inferred({ type: "string", minLength: 1.0 })
			).type.toString.snap("string")
		})

		it("large integer with a decimal mantissa", () => {
			attest(() =>
				inferred({ type: "string", maxLength: 1.5e21 })
			).type.errors.is("")
		})

		it("fraction in exponent notation", () => {
			// @ts-expect-error
			attest(() => inferred({ type: "string", minLength: 1e-7 })).type.errors(
				"minLength must be a non-negative integer (was 1e-7)"
			)
		})

		it("negative fraction", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "array", minItems: -0.5 })
			).type.errors("minItems must be a non-negative integer (was -0.5)")
		})

		it("negative exponent notation", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "array", maxItems: -1e3 })
			).type.errors("maxItems must be a non-negative integer (was -1e3)")
		})

		it("property and contains counts", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "object", minProperties: -1 })
			).type.errors("minProperties must be a non-negative integer (was -1)")
			attest(() =>
				// @ts-expect-error
				inferred({ type: "object", maxProperties: 0.5 })
			).type.errors("maxProperties must be a non-negative integer (was 0.5)")
			attest(() =>
				inferred({
					type: "array",
					contains: { type: "string" },
					// @ts-expect-error
					minContains: -2
				})
			).type.errors("minContains must be a non-negative integer (was -2)")
			attest(() =>
				inferred({
					type: "array",
					contains: { type: "string" },
					// @ts-expect-error
					maxContains: 2.5
				})
			).type.errors("maxContains must be a non-negative integer (was 2.5)")
		})

		it("count in a nested schema", () => {
			attest(() =>
				inferred({
					type: "array",
					items: {
						type: "string",
						// @ts-expect-error
						maxLength: -1
					}
				})
			).type.errors("maxLength must be a non-negative integer (was -1)")
		})

		it("count of the wrong kind", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "array", minItems: "1" })
			).type.errors("Type 'string' is not assignable to type 'number'")
		})
	})

	describe("ref validation", () => {
		it("unresolvable ref without definitions", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					properties: { a: { $ref: "#/$defs/x" } }
				})
			).type.errors(`Type '"#/$defs/x"' is not assignable to type '"#"'`)
		})

		it("unresolvable pointer", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					// @ts-expect-error
					$ref: "#/properties/b"
				})
			).type.errors(`'"#/properties/b"' is not assignable`)
		})

		it("resolvable pointer", () => {
			attest<string>(
				inferred({
					allOf: [{ $ref: "#/$defs/a/allOf/0" }],
					$defs: { a: { allOf: [{ type: "string" }] } }
				})
			).type.toString.snap("string")
		})

		it("refs inside definitions resolve against the root", () => {
			attest(() =>
				inferred({
					$defs: {
						a: {
							$defs: { b: { type: "string" } },
							// @ts-expect-error
							$ref: "#/$defs/b"
						}
					},
					$ref: "#/$defs/a"
				})
			).type.errors(`'"#/$defs/b"' is not assignable`)
		})

		it("completes $defs and definitions", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					definitions: { b: { type: "number" } },
					// @ts-expect-error
					$ref: "#/"
				})
			).completions({ "#/": ["#/$defs/a", "#/definitions/b"] })
		})

		it("completes escaped definition names", () => {
			attest(() =>
				inferred({
					$defs: { "a/b": { type: "string" }, "c~d": { type: "number" } },
					// @ts-expect-error
					$ref: "#/$defs/"
				})
			).completions({ "#/$defs/": ["#/$defs/a~1b", "#/$defs/c~0d"] })
		})

		it("ref of the wrong kind", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ $ref: 5 })
			).type.errors("Type 'number' is not assignable to type 'string'")
		})
	})

	describe("keyword validation", () => {
		it("type errors in each subschema position", () => {
			attest(() =>
				inferred({
					type: "array",
					// @ts-expect-error
					prefixItems: [{ type: "strin" }]
				})
			).type.errors(`Did you mean '"string"'?`)
			attest(() =>
				inferred({
					type: "array",
					// @ts-expect-error
					items: [{ type: "numbr" }]
				})
			).type.errors(`Did you mean '"number"'?`)
			attest(() =>
				inferred({
					// @ts-expect-error
					allOf: [{ type: "boolen" }]
				})
			).type.errors(`Did you mean '"boolean"'?`)
			attest(() =>
				inferred({
					// @ts-expect-error
					anyOf: [{ type: "nul" }]
				})
			).type.errors(`Did you mean '"null"'?`)
			attest(() =>
				inferred({
					// @ts-expect-error
					oneOf: [{ type: "objec" }]
				})
			).type.errors(`Did you mean '"object"'?`)
		})

		it("type errors in single subschema keywords", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ not: { type: "strin" } })
			).type.errors(`Did you mean '"string"'?`)
			attest(() =>
				// @ts-expect-error
				inferred({ if: { type: "strin" } })
			).type.errors(`Did you mean '"string"'?`)
			attest(() =>
				// @ts-expect-error
				inferred({ if: true, then: { type: "strin" } })
			).type.errors(`Did you mean '"string"'?`)
			attest(() =>
				// @ts-expect-error
				inferred({ if: true, else: { type: "strin" } })
			).type.errors(`Did you mean '"string"'?`)
			attest(() =>
				// @ts-expect-error
				inferred({ type: "array", contains: { type: "strin" } })
			).type.errors(`Did you mean '"string"'?`)
		})

		it("type errors in object subschema keywords", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					additionalProperties: { type: "strin" }
				})
			).type.errors(`Did you mean '"string"'?`)
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					unevaluatedProperties: { type: "strin" }
				})
			).type.errors(`Did you mean '"string"'?`)
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					patternProperties: { "^a": { type: "strin" } }
				})
			).type.errors(`Did you mean '"string"'?`)
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					dependentSchemas: { a: { type: "strin" } }
				})
			).type.errors(`Did you mean '"string"'?`)
		})

		it("type errors in definitions", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					$defs: { a: { type: "strin" } }
				})
			).type.errors(`Did you mean '"string"'?`)
			attest(() =>
				inferred({
					// @ts-expect-error
					definitions: { a: { type: "strin" } }
				})
			).type.errors(`Did you mean '"string"'?`)
		})

		it("type errors in array subschema keywords", () => {
			attest(() =>
				inferred({
					type: "array",
					// @ts-expect-error
					unevaluatedItems: { type: "strin" }
				})
			).type.errors(`Did you mean '"string"'?`)
			attest(() =>
				inferred({
					type: "array",
					items: [{ type: "string" }],
					// @ts-expect-error
					additionalItems: { type: "strin" }
				})
			).type.errors(`Did you mean '"string"'?`)
		})

		it("type errors in dependencies", () => {
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

		it("type name of the wrong kind in a list", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					type: ["string", 5]
				})
			).type.errors("Type 'number' is not assignable to type 'TypeName'")
		})

		it("non-schema subschemas", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					allOf: [{ type: "string" }, "number"]
				})
			).type.errors("JSON Schema must be an object or a boolean (was string)")
			attest(() =>
				// @ts-expect-error
				inferred({ not: null })
			).type.errors("JSON Schema must be an object or a boolean (was null)")
			attest(() =>
				// @ts-expect-error
				inferred({ type: "array", items: 5 })
			).type.errors("JSON Schema must be an object or a boolean (was number)")
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					properties: { a: [{ type: "string" }] }
				})
			).type.errors("JSON Schema must be an object or a boolean (was array)")
		})

		it("non-list list keywords", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ anyOf: { type: "string" } })
			).type.errors(
				"'type' does not exist in type 'readonly (boolean | object)[]'"
			)
		})

		it("array properties", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "object", properties: [{ type: "string" }] })
			).type.errors.snap(
				"Type '{ type: string; }[]' is not assignable to type '{ readonly [k: string]: boolean | object; }'.Index signature for type 'string' is missing in type '{ type: string; }[]'."
			)
		})

		it("non-object properties", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "object", properties: 5 })
			).type.errors(
				"is not assignable to type '{ readonly [k: string]: boolean | object; }'"
			)
		})

		it("required with properties is checked by key", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {},
					// @ts-expect-error
					required: ["a"]
				})
			).type.errors("Type 'string' is not assignable to type 'never'")
		})

		it("required of the wrong kind", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "object", required: ["a", 1] })
			).type.errors("Type 'number' is not assignable to type 'string'")
		})

		it("invalid member of a union schema", () => {
			const useString: boolean = true
			attest(() =>
				// @ts-expect-error
				inferred(useString ? { type: "string" } : { type: "strin" })
			).type.errors.snap(
				'Argument of type \'{ type: "string"; } | { type: "strin"; }\' is not assignable to parameter of type \'validateKeywords<{ readonly type: "strin"; }, { readonly type: "strin"; }, "document">\'.Type \'{ type: "strin"; }\' is not assignable to type \'validateKeywords<{ readonly type: "strin"; }, { readonly type: "strin"; }, "document">\'.Types of property \'type\' are incompatible.Type \'"strin"\' is not assignable to type \'TypeName\'. Did you mean \'"string"\'?'
			)
		})

		it("invalid member of a union subschema", () => {
			const useString: boolean = true
			// an inline conditional would widen each type to string
			const a =
				useString ? ({ type: "string" } as const) : ({ type: "strin" } as const)
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					properties: { a }
				})
			).type.errors.snap(
				'Type \'{ readonly type: "string"; } | { readonly type: "strin"; }\' is not assignable to type \'StaticallyValidSchema | validateKeywords<{ readonly type: "strin"; }, { readonly type: "object"; readonly properties: { readonly a: { readonly type: "string"; } | { readonly type: "strin"; }; }; }, "subschema">\'.Type \'{ readonly type: "strin"; }\' is not assignable to type \'StaticallyValidSchema | validateKeywords<{ readonly type: "strin"; }, { readonly type: "object"; readonly properties: { readonly a: { readonly type: "string"; } | { readonly type: "strin"; }; }; }, "subschema">\'.Type \'{ readonly type: "strin"; }\' is not assignable to type \'StaticallyValidSchemaObject | validateKeywords<{ readonly type: "strin"; }, { readonly type: "object"; readonly properties: { readonly a: { readonly type: "string"; } | { readonly type: "strin"; }; }; }, "subschema">\'.Type \'{ readonly type: "strin"; }\' is not assignable to type \'validateKeywords<{ readonly type: "strin"; }, { readonly type: "object"; readonly properties: { readonly a: { readonly type: "string"; } | { readonly type: "strin"; }; }; }, "subschema">\'.Types of property \'type\' are incompatible.Type \'"strin"\' is not assignable to type \'TypeName\'. Did you mean \'"string"\'?'
			)
		})

		it("propertyNames must accept strings", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					propertyNames: { type: "number" }
				})
			).type.errors(`Type '"number"' is not assignable to type '"string"'`)
		})

		it("propertyNames without type", () => {
			attest<object>(
				inferred({
					type: "object",
					propertyNames: { pattern: "^[a-z]+$", maxLength: 3 }
				})
			).type.toString.snap("object")
		})

		it("propertyNames with a string type list", () => {
			attest(() =>
				inferred({
					type: "object",
					propertyNames: { type: ["string"] }
				})
			).type.errors.is("")
		})

		it("annotations are never validated", () => {
			attest<string>(
				inferred({
					type: "string",
					title: 5,
					description: { a: 1 },
					default: { $ref: "#/nowhere" },
					examples: [{ type: "strin" }]
				})
			).type.toString.snap("string")
		})

		it("const values are never validated", () => {
			attest<{ readonly minLength: -1; readonly type: "strin" }>(
				inferred({ const: { minLength: -1, type: "strin" } })
			).type.toString.snap('{ readonly minLength: -1; readonly type: "strin" }')
		})
	})

	describe("completions", () => {
		it("type names in a list", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: ["string", "bo"] })
			).completions({ bo: ["boolean"] })
		})

		it("type names in a nested schema", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					properties: { a: { type: "nu" } }
				})
			).completions({ nu: ["null", "number"] })
		})

		it("required keys", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { alpha: true, beta: true, gamma: true },
					// @ts-expect-error
					required: ["alpha", ""]
				})
			).completions({ "": ["alpha", "beta", "gamma"] })
		})

		it("keyword names in a valid nested schema", () => {
			attest(() =>
				inferred({
					type: "object",
					// prettier-ignore
					properties: { a: { type: "string", "maxLe": 1 } }
				})
			).completions({ maxLe: ["maxLength"] })
		})
	})

	describe("display", () => {
		it("nested optional-only object", () => {
			attest<{ a: { b?: string } }>(
				inferred({
					type: "object",
					properties: {
						a: { type: "object", properties: { b: { type: "string" } } }
					},
					required: ["a"]
				})
			).type.toString.snap("{ a: { b?: string } }")
		})

		it("optional-only object in a type list", () => {
			attest<{ a?: string } | null>(
				inferred({
					type: ["object", "null"],
					properties: { a: { type: "string" } }
				})
			).type.toString.snap("{ a?: string } | null")
		})

		it("optional-only object from a definition", () => {
			attest<{ a?: string }>(
				inferred({
					$defs: {
						a: { type: "object", properties: { a: { type: "string" } } }
					},
					$ref: "#/$defs/a"
				})
			).type.toString.snap("{ a?: string }")
		})
	})

	describe("real world", () => {
		it("ts-json-schema-generator output", () => {
			attest(() =>
				inferred({
					$schema: "http://json-schema.org/draft-07/schema#",
					$ref: "#/definitions/Page%3Cstring%3E",
					definitions: {
						"Page<string>": {
							type: "object",
							properties: {
								items: { type: "array", items: { type: "string" } },
								next: { type: ["string", "null"] }
							},
							required: ["items", "next"],
							additionalProperties: false
						}
					}
				})
			).type.errors.is("")
		})

		it("composing toJsonSchema output", () => {
			const user = type({ name: "string" }).toJsonSchema()
			const T = jsonSchemaToType({
				type: "object",
				properties: { user },
				required: ["user"]
			})
			attest<{ user: unknown }>(T.infer).type.toString.snap("{ user: unknown }")
		})

		it("OpenAPI 3.0 component", () => {
			const T = inferred({
				$defs: {
					Pet: {
						type: "object",
						properties: {
							id: { type: "integer", format: "int64" },
							name: { type: "string" },
							tag: { type: "string", nullable: true }
						},
						required: ["id", "name"]
					},
					Cat: {
						allOf: [
							{ $ref: "#/$defs/Pet" },
							{
								type: "object",
								properties: { huntingSkill: { enum: ["lazy", "aggressive"] } },
								required: ["huntingSkill"]
							}
						]
					}
				},
				$ref: "#/$defs/Cat"
			})
			attest<{
				id: number
				name: string
				tag?: string | null
				huntingSkill: "lazy" | "aggressive"
			}>(T).type.toString.snap(`{
	id: number
	name: string
	tag?: string | null
	huntingSkill: "lazy" | "aggressive"
}`)
		})

		it("at least one of", () => {
			attest<{ a: string; b?: number } | { a?: string; b: number }>(
				inferred({
					type: "object",
					properties: { a: { type: "string" }, b: { type: "number" } },
					anyOf: [{ required: ["a"] }, { required: ["b"] }]
				})
			).type.toString.snap(`	| { a: string; b?: number }
	| { a?: string; b: number }`)
		})

		it("oneOf refs", () => {
			attest<{ meow: boolean } | { bark: boolean }>(
				inferred({
					$defs: {
						cat: {
							type: "object",
							properties: { meow: { type: "boolean" } },
							required: ["meow"]
						},
						dog: {
							type: "object",
							properties: { bark: { type: "boolean" } },
							required: ["bark"]
						}
					},
					oneOf: [{ $ref: "#/$defs/cat" }, { $ref: "#/$defs/dog" }]
				})
			).type.toString.snap("{ meow: boolean } | { bark: boolean }")
		})

		it("arktype round trip with index signature", () => {
			// type({ "[string]": "number", a: "string" }).toJsonSchema()
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				additionalProperties: { type: "number" }
			})
			attest<{ [k: string]: string | number; a: string }>(T).type.toString.snap(
				"{ [x: string]: string | number; a: string }"
			)
		})

		it("arktype round trip of an optional tuple with rest", () => {
			// type(["string", "number?", "...", "boolean[]"]).toJsonSchema()
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }, { type: "number" }],
				minItems: 1,
				items: { type: "boolean" }
			})
			attest<[string, number?, ...boolean[]]>(T.infer).type.toString.snap(
				"[string, number?, ...boolean[]]"
			)
		})

		it("OpenAPI 3.0 nullable recursion", () => {
			type Node = { value: string; next?: Node | null }
			const T = inferred({
				type: "object",
				properties: {
					value: { type: "string" },
					next: { $ref: "#", nullable: true }
				},
				required: ["value"]
			})
			attest<Node>(T)
			attest<string | undefined>(T.next?.next?.value)
		})

		it("linked list", () => {
			type Node = { value: string; next: Node | null }
			const T = inferred({
				$defs: {
					node: {
						type: "object",
						properties: {
							value: { type: "string" },
							next: { anyOf: [{ $ref: "#/$defs/node" }, { type: "null" }] }
						},
						required: ["value", "next"]
					}
				},
				$ref: "#/$defs/node"
			})
			attest<Node>(T)
			attest<string | undefined>(T.next?.next?.value)
		})
	})

	describe("scale", () => {
		type range<n extends number, acc extends number[] = []> =
			acc["length"] extends n ? acc[number] : range<n, [...acc, acc["length"]]>

		it("closed tuples nested forty deep", () => {
			type nest<s, depth extends 1[]> =
				depth["length"] extends 40 ? s
				:	nest<
						{ type: "array"; prefixItems: [s]; minItems: 1; items: false },
						[...depth, 1]
					>
			type expected<t, depth extends 1[]> =
				depth["length"] extends 40 ? t : expected<[t], [...depth, 1]>
			type T = jsonSchema.infer<nest<{ type: "string" }, []>>
			attest<expected<string, []>, T>()
			attest({} as 0 extends 1 & T ? true : false).type.toString.snap("false")
		})

		it("optional tuples nested forty deep", () => {
			// written out rather than built by a generic alias, which costs TS
			// another level of instantiation depth per level of nesting
			type L0 = { type: "string" }
			type L1 = { type: "array"; prefixItems: [L0]; items: false }
			type L2 = { type: "array"; prefixItems: [L1]; items: false }
			type L3 = { type: "array"; prefixItems: [L2]; items: false }
			type L4 = { type: "array"; prefixItems: [L3]; items: false }
			type L5 = { type: "array"; prefixItems: [L4]; items: false }
			type L6 = { type: "array"; prefixItems: [L5]; items: false }
			type L7 = { type: "array"; prefixItems: [L6]; items: false }
			type L8 = { type: "array"; prefixItems: [L7]; items: false }
			type L9 = { type: "array"; prefixItems: [L8]; items: false }
			type L10 = { type: "array"; prefixItems: [L9]; items: false }
			type L11 = { type: "array"; prefixItems: [L10]; items: false }
			type L12 = { type: "array"; prefixItems: [L11]; items: false }
			type L13 = { type: "array"; prefixItems: [L12]; items: false }
			type L14 = { type: "array"; prefixItems: [L13]; items: false }
			type L15 = { type: "array"; prefixItems: [L14]; items: false }
			type L16 = { type: "array"; prefixItems: [L15]; items: false }
			type L17 = { type: "array"; prefixItems: [L16]; items: false }
			type L18 = { type: "array"; prefixItems: [L17]; items: false }
			type L19 = { type: "array"; prefixItems: [L18]; items: false }
			type L20 = { type: "array"; prefixItems: [L19]; items: false }
			type L21 = { type: "array"; prefixItems: [L20]; items: false }
			type L22 = { type: "array"; prefixItems: [L21]; items: false }
			type L23 = { type: "array"; prefixItems: [L22]; items: false }
			type L24 = { type: "array"; prefixItems: [L23]; items: false }
			type L25 = { type: "array"; prefixItems: [L24]; items: false }
			type L26 = { type: "array"; prefixItems: [L25]; items: false }
			type L27 = { type: "array"; prefixItems: [L26]; items: false }
			type L28 = { type: "array"; prefixItems: [L27]; items: false }
			type L29 = { type: "array"; prefixItems: [L28]; items: false }
			type L30 = { type: "array"; prefixItems: [L29]; items: false }
			type L31 = { type: "array"; prefixItems: [L30]; items: false }
			type L32 = { type: "array"; prefixItems: [L31]; items: false }
			type L33 = { type: "array"; prefixItems: [L32]; items: false }
			type L34 = { type: "array"; prefixItems: [L33]; items: false }
			type L35 = { type: "array"; prefixItems: [L34]; items: false }
			type L36 = { type: "array"; prefixItems: [L35]; items: false }
			type L37 = { type: "array"; prefixItems: [L36]; items: false }
			type L38 = { type: "array"; prefixItems: [L37]; items: false }
			type L39 = { type: "array"; prefixItems: [L38]; items: false }
			type L40 = { type: "array"; prefixItems: [L39]; items: false }
			type expected<t, depth extends 1[]> =
				depth["length"] extends 40 ? t : expected<[t?], [...depth, 1]>
			attest<expected<string, []>, jsonSchema.infer<L40>>()
		})

		it("tuples with a rest nested thirty deep", () => {
			type nest<s, depth extends 1[]> =
				depth["length"] extends 30 ? s
				:	nest<
						{
							type: "array"
							prefixItems: [s]
							minItems: 1
							items: { type: "null" }
						},
						[...depth, 1]
					>
			type expected<t, depth extends 1[]> =
				depth["length"] extends 30 ? t : expected<[t, ...null[]], [...depth, 1]>
			type T = jsonSchema.infer<nest<{ type: "string" }, []>>
			attest<expected<string, []>, T>()
		})

		it("else-if chain forty deep", () => {
			type chain<s, depth extends 1[]> =
				depth["length"] extends 40 ? s
				:	chain<
						{
							if: {
								properties: { kind: { const: depth["length"] } }
								required: ["kind"]
							}
							then: { const: depth["length"] }
							else: s
						},
						[...depth, 1]
					>
			type T = jsonSchema.infer<chain<{ type: "null" }, []>>
			attest<range<40> | null, T>()
			attest({} as 0 extends 1 & T ? true : false).type.toString.snap("false")
		})

		it("allOf with a hundred object branches", () => {
			type branches<acc extends unknown[]> =
				acc["length"] extends 100 ? acc
				:	branches<
						[
							...acc,
							{
								type: "object"
								properties: { [k in `k${acc["length"]}`]: { type: "number" } }
								required: [`k${acc["length"]}`]
							}
						]
					>
			type T = jsonSchema.infer<{ type: "object"; allOf: branches<[]> }>
			attest<{ [k in `k${range<100>}`]: number }, T>()
		})

		it("allOf with twenty-four branches narrowing a shared key", () => {
			type branches<acc extends unknown[]> =
				acc["length"] extends 23 ?
					[...acc, { properties: { k0: { const: 0 } } }]
				:	branches<
						[
							...acc,
							{
								properties: { [k in `k${acc["length"]}`]: { type: "number" } }
								required: [`k${acc["length"]}`]
							}
						]
					>
			type T = jsonSchema.infer<{ type: "object"; allOf: branches<[]> }>
			attest<{ k0: 0 } & { [k in `k${Exclude<range<23>, 0>}`]: number }, T>()
		})

		it("allOf with twenty-four branches across domains", () => {
			type branches<acc extends unknown[]> =
				acc["length"] extends 23 ? [...acc, { type: "string" }]
				:	branches<[...acc, { properties: { a: { type: "number" } } }]>
			type T = jsonSchema.infer<{ allOf: branches<[]> }>
			attest<string, T>()
		})

		it("oneOf of a hundred refs", () => {
			type refs<acc extends unknown[]> =
				acc["length"] extends 100 ? acc
				:	refs<[...acc, { $ref: `#/$defs/d${acc["length"]}` }]>
			type T = jsonSchema.infer<{
				$defs: {
					[k in range<100> as `d${k}`]: {
						type: "object"
						properties: { kind: { const: k } }
						required: ["kind"]
					}
				}
				oneOf: refs<[]>
			}>
			attest<{ [k in range<100>]: { kind: k } }[range<100>], T>()
		})

		it("ref chain two hundred deep", () => {
			type T = jsonSchema.infer<{
				$defs: {
					[k in range<200> as `d${k}`]: k extends 199 ? { type: "string" }
					:	{ $ref: `#/$defs/d${next<k>}` }
				}
				$ref: "#/$defs/d0"
			}>
			type next<n extends number, acc extends 1[] = []> =
				acc["length"] extends n ? [...acc, 1]["length"] & number
				:	next<n, [...acc, 1]>
			attest<string, T>()
		})

		it("enum of five hundred strings", () => {
			type values<acc extends string[]> =
				acc["length"] extends 500 ? acc : values<[...acc, `v${acc["length"]}`]>
			type T = jsonSchema.infer<{ type: "string"; enum: values<[]> }>
			attest<`v${range<500>}`, T>()
		})

		it("anyOf nested thirty-four deep", () => {
			attest(() =>
				// prettier-ignore
				inferred({ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ anyOf: [{ type: "string" }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] })
			).type.errors.is("")
		})
	})

	describe("cost limits", () => {
		type range<n extends number, acc extends number[] = []> =
			acc["length"] extends n ? acc[number] : range<n, [...acc, acc["length"]]>
		type next<n extends number, acc extends 1[] = []> =
			acc["length"] extends n ? [...acc, 1]["length"] & number
			:	next<n, [...acc, 1]>
		type pairs<k extends string> =
			| { [_ in `a${k}`]: number }
			| { [_ in `b${k}`]: string }

		it("allOf of ten refs to if/then/else rules", () => {
			attest.instantiations([15000, "instantiations"])
			return inferred({
				type: "object",
				properties: { kind: { type: "string" } },
				$defs: {
					r0: {
						if: { properties: { kind: { const: "k0" } } },
						then: { properties: { v0: { type: "number" } }, required: ["v0"] },
						else: { properties: { w0: { type: "string" } } }
					},
					r1: {
						if: { properties: { kind: { const: "k1" } } },
						then: { properties: { v1: { type: "number" } }, required: ["v1"] },
						else: { properties: { w1: { type: "string" } } }
					},
					r2: {
						if: { properties: { kind: { const: "k2" } } },
						then: { properties: { v2: { type: "number" } }, required: ["v2"] },
						else: { properties: { w2: { type: "string" } } }
					},
					r3: {
						if: { properties: { kind: { const: "k3" } } },
						then: { properties: { v3: { type: "number" } }, required: ["v3"] },
						else: { properties: { w3: { type: "string" } } }
					},
					r4: {
						if: { properties: { kind: { const: "k4" } } },
						then: { properties: { v4: { type: "number" } }, required: ["v4"] },
						else: { properties: { w4: { type: "string" } } }
					},
					r5: {
						if: { properties: { kind: { const: "k5" } } },
						then: { properties: { v5: { type: "number" } }, required: ["v5"] },
						else: { properties: { w5: { type: "string" } } }
					},
					r6: {
						if: { properties: { kind: { const: "k6" } } },
						then: { properties: { v6: { type: "number" } }, required: ["v6"] },
						else: { properties: { w6: { type: "string" } } }
					},
					r7: {
						if: { properties: { kind: { const: "k7" } } },
						then: { properties: { v7: { type: "number" } }, required: ["v7"] },
						else: { properties: { w7: { type: "string" } } }
					},
					r8: {
						if: { properties: { kind: { const: "k8" } } },
						then: { properties: { v8: { type: "number" } }, required: ["v8"] },
						else: { properties: { w8: { type: "string" } } }
					},
					r9: {
						if: { properties: { kind: { const: "k9" } } },
						then: { properties: { v9: { type: "number" } }, required: ["v9"] },
						else: { properties: { w9: { type: "string" } } }
					}
				},
				allOf: [
					{ $ref: "#/$defs/r0" },
					{ $ref: "#/$defs/r1" },
					{ $ref: "#/$defs/r2" },
					{ $ref: "#/$defs/r3" },
					{ $ref: "#/$defs/r4" },
					{ $ref: "#/$defs/r5" },
					{ $ref: "#/$defs/r6" },
					{ $ref: "#/$defs/r7" },
					{ $ref: "#/$defs/r8" },
					{ $ref: "#/$defs/r9" }
				]
			})
		})

		it("allOf of twelve refs to anyOf definitions", () => {
			attest.instantiations([15000, "instantiations"])
			return inferred({
				type: "object",
				$defs: {
					r0: {
						anyOf: [
							{ properties: { a0: { type: "number" } }, required: ["a0"] },
							{ properties: { b0: { type: "string" } }, required: ["b0"] }
						]
					},
					r1: {
						anyOf: [
							{ properties: { a1: { type: "number" } }, required: ["a1"] },
							{ properties: { b1: { type: "string" } }, required: ["b1"] }
						]
					},
					r2: {
						anyOf: [
							{ properties: { a2: { type: "number" } }, required: ["a2"] },
							{ properties: { b2: { type: "string" } }, required: ["b2"] }
						]
					},
					r3: {
						anyOf: [
							{ properties: { a3: { type: "number" } }, required: ["a3"] },
							{ properties: { b3: { type: "string" } }, required: ["b3"] }
						]
					},
					r4: {
						anyOf: [
							{ properties: { a4: { type: "number" } }, required: ["a4"] },
							{ properties: { b4: { type: "string" } }, required: ["b4"] }
						]
					},
					r5: {
						anyOf: [
							{ properties: { a5: { type: "number" } }, required: ["a5"] },
							{ properties: { b5: { type: "string" } }, required: ["b5"] }
						]
					},
					r6: {
						anyOf: [
							{ properties: { a6: { type: "number" } }, required: ["a6"] },
							{ properties: { b6: { type: "string" } }, required: ["b6"] }
						]
					},
					r7: {
						anyOf: [
							{ properties: { a7: { type: "number" } }, required: ["a7"] },
							{ properties: { b7: { type: "string" } }, required: ["b7"] }
						]
					},
					r8: {
						anyOf: [
							{ properties: { a8: { type: "number" } }, required: ["a8"] },
							{ properties: { b8: { type: "string" } }, required: ["b8"] }
						]
					},
					r9: {
						anyOf: [
							{ properties: { a9: { type: "number" } }, required: ["a9"] },
							{ properties: { b9: { type: "string" } }, required: ["b9"] }
						]
					},
					r10: {
						anyOf: [
							{ properties: { a10: { type: "number" } }, required: ["a10"] },
							{ properties: { b10: { type: "string" } }, required: ["b10"] }
						]
					},
					r11: {
						anyOf: [
							{ properties: { a11: { type: "number" } }, required: ["a11"] },
							{ properties: { b11: { type: "string" } }, required: ["b11"] }
						]
					}
				},
				allOf: [
					{ $ref: "#/$defs/r0" },
					{ $ref: "#/$defs/r1" },
					{ $ref: "#/$defs/r2" },
					{ $ref: "#/$defs/r3" },
					{ $ref: "#/$defs/r4" },
					{ $ref: "#/$defs/r5" },
					{ $ref: "#/$defs/r6" },
					{ $ref: "#/$defs/r7" },
					{ $ref: "#/$defs/r8" },
					{ $ref: "#/$defs/r9" },
					{ $ref: "#/$defs/r10" },
					{ $ref: "#/$defs/r11" }
				]
			})
		})

		it("allOf of six nested allOfs of three anyOfs each", () => {
			attest.instantiations([20000, "instantiations"])
			const T = inferred({
				type: "object",
				allOf: [
					{
						allOf: [
							{
								anyOf: [
									{
										properties: { a0_0: { type: "number" } },
										required: ["a0_0"]
									},
									{
										properties: { b0_0: { type: "string" } },
										required: ["b0_0"]
									}
								]
							},
							{
								anyOf: [
									{
										properties: { a0_1: { type: "number" } },
										required: ["a0_1"]
									},
									{
										properties: { b0_1: { type: "string" } },
										required: ["b0_1"]
									}
								]
							},
							{
								anyOf: [
									{
										properties: { a0_2: { type: "number" } },
										required: ["a0_2"]
									},
									{
										properties: { b0_2: { type: "string" } },
										required: ["b0_2"]
									}
								]
							}
						]
					},
					{
						allOf: [
							{
								anyOf: [
									{
										properties: { a1_0: { type: "number" } },
										required: ["a1_0"]
									},
									{
										properties: { b1_0: { type: "string" } },
										required: ["b1_0"]
									}
								]
							},
							{
								anyOf: [
									{
										properties: { a1_1: { type: "number" } },
										required: ["a1_1"]
									},
									{
										properties: { b1_1: { type: "string" } },
										required: ["b1_1"]
									}
								]
							},
							{
								anyOf: [
									{
										properties: { a1_2: { type: "number" } },
										required: ["a1_2"]
									},
									{
										properties: { b1_2: { type: "string" } },
										required: ["b1_2"]
									}
								]
							}
						]
					},
					{
						allOf: [
							{
								anyOf: [
									{
										properties: { a2_0: { type: "number" } },
										required: ["a2_0"]
									},
									{
										properties: { b2_0: { type: "string" } },
										required: ["b2_0"]
									}
								]
							},
							{
								anyOf: [
									{
										properties: { a2_1: { type: "number" } },
										required: ["a2_1"]
									},
									{
										properties: { b2_1: { type: "string" } },
										required: ["b2_1"]
									}
								]
							},
							{
								anyOf: [
									{
										properties: { a2_2: { type: "number" } },
										required: ["a2_2"]
									},
									{
										properties: { b2_2: { type: "string" } },
										required: ["b2_2"]
									}
								]
							}
						]
					},
					{
						allOf: [
							{
								anyOf: [
									{
										properties: { a3_0: { type: "number" } },
										required: ["a3_0"]
									},
									{
										properties: { b3_0: { type: "string" } },
										required: ["b3_0"]
									}
								]
							},
							{
								anyOf: [
									{
										properties: { a3_1: { type: "number" } },
										required: ["a3_1"]
									},
									{
										properties: { b3_1: { type: "string" } },
										required: ["b3_1"]
									}
								]
							},
							{
								anyOf: [
									{
										properties: { a3_2: { type: "number" } },
										required: ["a3_2"]
									},
									{
										properties: { b3_2: { type: "string" } },
										required: ["b3_2"]
									}
								]
							}
						]
					},
					{
						allOf: [
							{
								anyOf: [
									{
										properties: { a4_0: { type: "number" } },
										required: ["a4_0"]
									},
									{
										properties: { b4_0: { type: "string" } },
										required: ["b4_0"]
									}
								]
							},
							{
								anyOf: [
									{
										properties: { a4_1: { type: "number" } },
										required: ["a4_1"]
									},
									{
										properties: { b4_1: { type: "string" } },
										required: ["b4_1"]
									}
								]
							},
							{
								anyOf: [
									{
										properties: { a4_2: { type: "number" } },
										required: ["a4_2"]
									},
									{
										properties: { b4_2: { type: "string" } },
										required: ["b4_2"]
									}
								]
							}
						]
					},
					{
						allOf: [
							{
								anyOf: [
									{
										properties: { a5_0: { type: "number" } },
										required: ["a5_0"]
									},
									{
										properties: { b5_0: { type: "string" } },
										required: ["b5_0"]
									}
								]
							},
							{
								anyOf: [
									{
										properties: { a5_1: { type: "number" } },
										required: ["a5_1"]
									},
									{
										properties: { b5_1: { type: "string" } },
										required: ["b5_1"]
									}
								]
							},
							{
								anyOf: [
									{
										properties: { a5_2: { type: "number" } },
										required: ["a5_2"]
									},
									{
										properties: { b5_2: { type: "string" } },
										required: ["b5_2"]
									}
								]
							}
						]
					}
				]
			})
			attest({} as 0 extends 1 & typeof T ? true : false).type.toString.snap(
				"false"
			)
			return T
		})

		it("a fourth union-producing ref keeps only its other keywords", () => {
			const T = inferred({
				type: "object",
				$defs: {
					r0: {
						anyOf: [
							{ properties: { a0: { type: "number" } }, required: ["a0"] },
							{ properties: { b0: { type: "string" } }, required: ["b0"] }
						]
					},
					r1: {
						anyOf: [
							{ properties: { a1: { type: "number" } }, required: ["a1"] },
							{ properties: { b1: { type: "string" } }, required: ["b1"] }
						]
					},
					r2: {
						anyOf: [
							{ properties: { a2: { type: "number" } }, required: ["a2"] },
							{ properties: { b2: { type: "string" } }, required: ["b2"] }
						]
					},
					r3: {
						anyOf: [
							{ properties: { a3: { type: "number" } }, required: ["a3"] },
							{ properties: { b3: { type: "string" } }, required: ["b3"] }
						],
						properties: { kept: { type: "boolean" } },
						required: ["kept"]
					}
				},
				allOf: [
					{ $ref: "#/$defs/r0" },
					{ $ref: "#/$defs/r1" },
					{ $ref: "#/$defs/r2" },
					{ $ref: "#/$defs/r3" }
				]
			})
			attest<
				pairs<"0"> & pairs<"1"> & pairs<"2"> & { kept: boolean } extends (
					infer t
				) ?
					{ [k in keyof t]: t[k] }
				:	never
			>(T).type.toString
				.snap(`	| { a0: number; a1: number; a2: number; kept: boolean }
	| { a0: number; a1: number; b2: string; kept: boolean }
	| { a0: number; b1: string; a2: number; kept: boolean }
	| { a0: number; b1: string; b2: string; kept: boolean }
	| { b0: string; a1: number; a2: number; kept: boolean }
	| { b0: string; a1: number; b2: string; kept: boolean }
	| { b0: string; b1: string; a2: number; kept: boolean }
	| { b0: string; b1: string; b2: string; kept: boolean }`)
		})

		it("nested allOfs share the union-producing branch count", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{
						allOf: [
							{
								anyOf: [
									{ properties: { a0: { type: "number" } }, required: ["a0"] },
									{ properties: { b0: { type: "string" } }, required: ["b0"] }
								]
							},
							{
								anyOf: [
									{ properties: { a1: { type: "number" } }, required: ["a1"] },
									{ properties: { b1: { type: "string" } }, required: ["b1"] }
								]
							}
						]
					},
					{
						allOf: [
							{
								anyOf: [
									{ properties: { a2: { type: "number" } }, required: ["a2"] },
									{ properties: { b2: { type: "string" } }, required: ["b2"] }
								]
							},
							{
								anyOf: [
									{ properties: { a3: { type: "number" } }, required: ["a3"] },
									{ properties: { b3: { type: "string" } }, required: ["b3"] }
								]
							}
						]
					}
				]
			})
			attest<
				pairs<"0"> & pairs<"1"> & pairs<"2"> extends infer t ?
					{ [k in keyof t]: t[k] }
				:	never
			>(T).type.toString.snap(`	| { a0: number; a1: number; a2: number }
	| { a0: number; a1: number; b2: string }
	| { a0: number; b1: string; a2: number }
	| { a0: number; b1: string; b2: string }
	| { b0: string; a1: number; a2: number }
	| { b0: string; a1: number; b2: string }
	| { b0: string; b1: string; a2: number }
	| { b0: string; b1: string; b2: string }`)
		})

		it("allOf DAG of refs thirty deep", () => {
			// each definition is reached through two paths, which TS used to
			// relate and copy declarations for exponentially often
			type T = jsonSchema.infer<{
				$defs: {
					[i in range<30> as `d${i}`]: i extends 28 | 29 ?
						{
							type: "object"
							properties: { [_ in `k${i}`]: { type: "string" } }
						}
					:	{
							allOf: [
								{ $ref: `#/$defs/d${next<i>}` },
								{ $ref: `#/$defs/d${next<next<i>>}` },
								{
									type: "object"
									properties: { [_ in `k${i}`]: { type: "string" } }
								}
							]
						}
				}
				$ref: "#/$defs/d0"
			}>
			attest<{ [k in `k${range<30>}`]?: string }, T>()
		})

		it("ref chain with a rule at each level eleven deep", () => {
			// limitation: each level's allOf of a $ref and an if/then/else doubles the union (2^n members, TS2589 from 16 levels)
			attest.instantiations([433000, "instantiations"])
			return inferred({
				$defs: {
					d0: {
						allOf: [
							{ $ref: "#/$defs/d1" },
							{
								if: { properties: { kind: { const: "k0" } } },
								then: {
									properties: { v0: { type: "number" } },
									required: ["v0"]
								},
								else: { properties: { w0: { type: "string" } } }
							}
						]
					},
					d1: {
						allOf: [
							{ $ref: "#/$defs/d2" },
							{
								if: { properties: { kind: { const: "k1" } } },
								then: {
									properties: { v1: { type: "number" } },
									required: ["v1"]
								},
								else: { properties: { w1: { type: "string" } } }
							}
						]
					},
					d2: {
						allOf: [
							{ $ref: "#/$defs/d3" },
							{
								if: { properties: { kind: { const: "k2" } } },
								then: {
									properties: { v2: { type: "number" } },
									required: ["v2"]
								},
								else: { properties: { w2: { type: "string" } } }
							}
						]
					},
					d3: {
						allOf: [
							{ $ref: "#/$defs/d4" },
							{
								if: { properties: { kind: { const: "k3" } } },
								then: {
									properties: { v3: { type: "number" } },
									required: ["v3"]
								},
								else: { properties: { w3: { type: "string" } } }
							}
						]
					},
					d4: {
						allOf: [
							{ $ref: "#/$defs/d5" },
							{
								if: { properties: { kind: { const: "k4" } } },
								then: {
									properties: { v4: { type: "number" } },
									required: ["v4"]
								},
								else: { properties: { w4: { type: "string" } } }
							}
						]
					},
					d5: {
						allOf: [
							{ $ref: "#/$defs/d6" },
							{
								if: { properties: { kind: { const: "k5" } } },
								then: {
									properties: { v5: { type: "number" } },
									required: ["v5"]
								},
								else: { properties: { w5: { type: "string" } } }
							}
						]
					},
					d6: {
						allOf: [
							{ $ref: "#/$defs/d7" },
							{
								if: { properties: { kind: { const: "k6" } } },
								then: {
									properties: { v6: { type: "number" } },
									required: ["v6"]
								},
								else: { properties: { w6: { type: "string" } } }
							}
						]
					},
					d7: {
						allOf: [
							{ $ref: "#/$defs/d8" },
							{
								if: { properties: { kind: { const: "k7" } } },
								then: {
									properties: { v7: { type: "number" } },
									required: ["v7"]
								},
								else: { properties: { w7: { type: "string" } } }
							}
						]
					},
					d8: {
						allOf: [
							{ $ref: "#/$defs/d9" },
							{
								if: { properties: { kind: { const: "k8" } } },
								then: {
									properties: { v8: { type: "number" } },
									required: ["v8"]
								},
								else: { properties: { w8: { type: "string" } } }
							}
						]
					},
					d9: {
						allOf: [
							{ $ref: "#/$defs/d10" },
							{
								if: { properties: { kind: { const: "k9" } } },
								then: {
									properties: { v9: { type: "number" } },
									required: ["v9"]
								},
								else: { properties: { w9: { type: "string" } } }
							}
						]
					},
					d10: { type: "object", properties: { kind: { type: "string" } } }
				},
				$ref: "#/$defs/d0"
			})
		})

		it("nested allOf with an index branch at each level, thirty-two deep", () => {
			// limitation: reading a key through 24+ levels of allOf merges with an index branch raises TS2589 and gives any
			type L0 = { properties: { leaf: { type: "string" } } }
			type L1 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L0, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L2 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L1, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L3 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L2, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L4 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L3, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L5 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L4, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L6 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L5, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L7 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L6, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L8 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L7, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L9 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L8, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L10 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L9, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L11 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L10, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L12 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L11, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L13 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L12, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L14 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L13, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L15 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L14, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L16 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L15, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L17 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L16, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L18 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L17, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L19 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L18, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L20 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L19, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L21 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L20, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L22 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L21, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L23 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L22, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L24 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L23, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L25 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L24, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L26 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L25, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L27 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L26, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L28 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L27, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L29 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L28, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L30 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L29, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L31 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L30, { additionalProperties: { type: ["number", "string"] } }]
			}
			type L32 = {
				type: "object"
				properties: { a: { type: "number" } }
				allOf: [L31, { additionalProperties: { type: ["number", "string"] } }]
			}
			type T = jsonSchema.infer<L32>
			// @ts-ignore
			type leaf = T["leaf"]
			attest({} as leaf).type.toString.snap("any")
		})

		it("a fourth ref to an allOf definition keeps its allOf", () => {
			const T = inferred({
				type: "object",
				$defs: {
					a1: {
						allOf: [
							{ properties: { p1: { type: "string" } }, required: ["p1"] }
						]
					},
					a2: {
						allOf: [
							{ properties: { p2: { type: "string" } }, required: ["p2"] }
						]
					},
					a3: {
						allOf: [
							{ properties: { p3: { type: "string" } }, required: ["p3"] }
						]
					},
					a4: {
						allOf: [
							{ properties: { p4: { type: "string" } }, required: ["p4"] }
						]
					}
				},
				allOf: [
					{ $ref: "#/$defs/a1" },
					{ $ref: "#/$defs/a2" },
					{ $ref: "#/$defs/a3" },
					{ $ref: "#/$defs/a4" }
				]
			})
			type expected = { p1: string; p2: string; p3: string; p4: string }
			attest(
				{} as [typeof T, expected] extends [expected, typeof T] ? true : false
			).type.toString.snap("true")
		})

		it("refs to union-free allOf or ref definitions count toward the union limit", () => {
			// limitation: a ref to an allOf or ref definition counts toward the union limit even when it can't produce a union, so the anyOf after three is dropped (sound, wider)
			const T = inferred({
				type: "object",
				$defs: {
					a1: { allOf: [{ properties: { p1: { type: "string" } } }] },
					a2: { allOf: [{ properties: { p2: { type: "string" } } }] },
					a3: { $ref: "#/$defs/a3x" },
					a3x: { properties: { p3: { type: "string" } } },
					u: {
						anyOf: [
							{ properties: { x: { type: "number" } }, required: ["x"] },
							{ properties: { y: { type: "string" } }, required: ["y"] }
						]
					}
				},
				allOf: [
					{ $ref: "#/$defs/a1" },
					{ $ref: "#/$defs/a2" },
					{ $ref: "#/$defs/a3" },
					{ $ref: "#/$defs/u" }
				]
			})
			attest<{ p1?: string; p2?: string; p3?: string }>(T).type.toString.snap(
				"{ p1?: string; p2?: string; p3?: string }"
			)
		})
	})

	describe("hand-written subschema types", () => {
		// @types/json-schema's JSONSchema4 shape: every keyword optional, plus an `any` index
		interface JSONSchema4 {
			[k: string]: any
			type?: string | string[] | undefined
			properties?: { [k: string]: JSONSchema4 } | undefined
			items?: JSONSchema4 | JSONSchema4[] | undefined
			required?: boolean | string[] | undefined
			allOf?: JSONSchema4[] | undefined
			anyOf?: JSONSchema4[] | undefined
			not?: JSONSchema4 | undefined
			$ref?: string | undefined
		}

		it("a property ref to an allOf over an arktype JsonSchema definition", () => {
			// asserted, since a declared JsonSchema would be narrowed by its initializer
			const base = { type: "object" } as JsonSchema
			const T = inferred({
				$defs: {
					base,
					admin: {
						allOf: [
							{ $ref: "#/$defs/base" },
							{
								type: "object",
								properties: { role: { const: "admin" } },
								required: ["role"]
							}
						]
					}
				},
				type: "object",
				properties: { a: { $ref: "#/$defs/admin" } }
			})
			attest<{ role: "admin" } | undefined>(T.a).type.toString.snap(
				'{ role: "admin" } | undefined'
			)
		})

		it("a recursive hand-written union schema type through anyOf", () => {
			// limitation: TS2589 (any): a recursive hand-written schema union with no all-optional member recurses eagerly through anyOf
			type Rec = { type: "string" } | { type: "number" } | { anyOf: Rec[] }
			type T = jsonSchema.infer<{ type: "object"; properties: { a: Rec } }>
			// @ts-ignore
			type a = T["a"]
			attest({} as a).type.toString.snap("any")
		})

		it("const beside a recursive hand-written union schema type", () => {
			// limitation: TS2589 (any): the same with no $ref member, as containsRef walks the union forever
			type Rec = { type: "string" } | { type: "array"; items: Rec }
			// @ts-ignore
			type T = jsonSchema.infer<{ type: "array"; items: Rec; const: [["a"]] }>
			attest({} as T).type.toString.snap("any")
		})

		it("a recursive hand-written schema interface through properties and items", () => {
			interface Tree {
				type: "object"
				properties: {
					value: { type: "number" }
					children: { type: "array"; items: Tree }
				}
				required: ["value"]
			}
			const T = inferType<Tree>()
			attest<number>(T.value)
			attest<number | undefined>(T.children?.[0]?.value)
		})

		it("a type with a string index may have nullable", () => {
			// limitation: a string-indexed schema type may have `nullable: true`, but the type fast path (StringSchema's `nullable?: never`) accepts it, so null is missed (rare shape)
			attest(
				inferType<{ type: "string"; [k: string]: unknown }>()
			).type.toString.snap("string")
		})

		it("a type with a template-literal index can't have nullable", () => {
			attest<string>(
				inferType<{ type: "string"; [k: `x-${string}`]: unknown }>()
			).type.toString.snap("string")
		})

		it("an any patternProperties value", () => {
			// limitation: `any` is assignable to FalsePatterns, so an any pattern value closes the object (sound: object is wider than an any index)
			attest(
				inferType<{
					type: "object"
					patternProperties: { "^x": any }
					additionalProperties: false
				}>()
			).type.toString.snap("object")
		})

		it("a widened patternProperties keyword beside additionalProperties false", () => {
			// limitation: a widened patternProperties beside additionalProperties false gives a never index (inferValues<unknown> is never), though { "^x": true } may match (rare shape)
			attest(
				inferType<{
					type: "object"
					patternProperties: unknown
					additionalProperties: false
				}>()
			).type.toString.snap("{ [x: string]: never }")
		})

		it("arktype JsonSchema members at every subschema position", () => {
			attest<[object]>(
				inferType<{
					type: "array"
					prefixItems: [JsonSchema.Object]
					items: false
					minItems: 1
				}>()
			).type.toString.snap("[object]")
			attest<{ [x: string]: string | number; b?: number }>(
				inferType<{
					type: "object"
					properties: { b: { type: "number" } }
					additionalProperties: JsonSchema.String
				}>()
			).type.toString.snap("{ [x: string]: string | number; b?: number }")
			attest<{ [x: string]: object }>(
				inferType<{
					type: "object"
					patternProperties: { "^x": JsonSchema.Object }
					additionalProperties: false
				}>()
			).type.toString.snap("{ [x: string]: object }")
			attest<string | boolean>(
				inferType<{ anyOf: [JsonSchema.String, { type: "boolean" }] }>()
			).type.toString.snap("string | boolean")
			attest<number>(
				inferType<{
					type: ["string", "number", "boolean"]
					if: { type: "string" }
					then: JsonSchema.Object
					else: { type: "number" }
				}>()
			).type.toString.snap("number")
			attest<never>(
				inferType<{
					$defs: { a: JsonSchema.Object }
					$ref: "#/$defs/a"
					type: ["string", "boolean"]
				}>()
			).type.toString.snap("never")
			attest<string>(
				inferType<{
					$defs: {
						a: { $ref: "#/$defs/b" }
						b: { $ref: "#/$defs/c" }
						c: JsonSchema.String
					}
					$ref: "#/$defs/a"
				}>()
			).type.toString.snap("string")
		})

		it("const and enum beside arktype JsonSchema members", () => {
			attest<{ a: [1] }>(
				inferType<{
					type: "object"
					properties: { a: JsonSchema.Object }
					const: { a: [1] }
				}>()
			).type.toString.snap("{ a: [1] }")
			attest<["x"]>(
				inferType<{
					type: "array"
					items: JsonSchema.String
					enum: [[1], ["x"]]
				}>()
			).type.toString.snap('["x"]')
			attest<string[]>(
				inferType<{
					type: "array"
					items: JsonSchema.String
					not: { const: [1] }
				}>()
			).type.toString.snap("string[]")
		})

		it("a JSONSchema4-like any index at every subschema position", () => {
			attest<{ a: unknown }>(
				inferType<{
					type: "object"
					properties: { a: JSONSchema4 }
					required: ["a"]
				}>()
			).type.toString.snap("{ a: unknown }")
			attest<{ b?: number }>(
				inferType<{
					allOf: [
						JSONSchema4,
						{ type: "object"; properties: { b: { type: "number" } } }
					]
				}>()
			).type.toString.snap("{ b?: number }")
			attest<unknown>(
				inferType<{
					$defs: {
						a: { $ref: "#/$defs/b" }
						b: { $ref: "#/$defs/c" }
						c: JSONSchema4
					}
					$ref: "#/$defs/a"
				}>()
			).type.toString.snap("unknown")
			attest<[[1]]>(
				inferType<{
					$defs: {
						a: { $ref: "#/$defs/b" }
						b: { type: "array"; items: { $ref: "#/$defs/c" } }
						c: JSONSchema4
					}
					$ref: "#/$defs/a"
					const: [[1]]
				}>()
			).type.toString.snap("[[1]]")
			type S = { type: "array"; items: JSONSchema4; not: JSONSchema4 }
			attest<true, [S] extends [jsonSchema.validate<S>] ? true : false>()
		})

		it("optional and union keyword values in not", () => {
			// the not may be {}, which rejects everything, or { type: "string" }
			attest<number>(
				inferType<{ type: ["string", "number"]; not: { type?: "string" } }>()
			).type.toString.snap("number")
			attest<string | number>(
				inferType<{
					type: ["string", "number"]
					not: { type: "string" } | { type: "number" }
				}>()
			).type.toString.snap("string | number")
		})

		it("keyword-level any", () => {
			attest<{ a?: string }>(
				inferType<{
					type: "object"
					properties: { a: { type: "string" } }
					required: any
				}>()
			).type.toString.snap("{ a?: string }")
			attest<object>(
				inferType<{ type: "object"; allOf: any }>()
			).type.toString.snap("object")
			attest<string | null>(
				inferType<{ type: "string"; nullable: any }>()
			).type.toString.snap("string | null")
			attest<string | number>(
				inferType<{
					if: any
					then: { type: "string" }
					else: { type: "number" }
				}>()
			).type.toString.snap("string | number")
			// any dialect: siblings may be ignored, so the target alone
			attest<string>(
				inferType<{
					$schema: any
					$defs: { a: { type: "string" } }
					$ref: "#/$defs/a"
					type: "number"
				}>()
			).type.toString.snap("string")
		})
	})

	describe("composed jsonSchema values", () => {
		it("spreading a jsonSchema value to loosen it", () => {
			const base = jsonSchema({
				type: "object",
				properties: { id: { type: "string" } },
				required: ["id"]
			})
			attest(jsonSchema({ ...base, required: [] }).infer).type.toString.snap(
				"{ id?: string }"
			)
			attest(
				jsonSchemaToType({ ...base, required: [] }).infer
			).type.toString.snap("{ id?: string }")
		})

		it("object rest of a jsonSchema value", () => {
			const base = jsonSchema({
				type: "object",
				properties: { id: { type: "string" } },
				required: ["id"]
			})
			const { required: _, ...rest } = base
			attest(jsonSchema(rest).infer).type.toString.snap("{ id?: string }")
		})

		it("spreading a jsonSchema.as value", () => {
			const named = jsonSchema.as<{ name: string }>({})
			attest(jsonSchema({ ...named, type: "number" }).infer).type.toString.snap(
				"number"
			)
		})

		it("a jsonSchema.as value as an allOf branch", () => {
			const named = jsonSchema.as<{ name: string }>({})
			attest(
				jsonSchema({
					allOf: [
						named,
						{ type: "object", properties: { b: { type: "number" } } }
					]
				}).infer
			).type.toString.snap("{ name: string; b?: number }")
		})

		it("a composed identified resource keeps its own refs", () => {
			const node = jsonSchema({
				$id: "https://example.com/node",
				$defs: { leaf: { type: "string" } },
				type: "object",
				properties: { leaf: { $ref: "#/$defs/leaf" } }
			})
			attest<{ leaf?: string }[]>(
				jsonSchema({ type: "array", items: node }).infer
			).type.toString.snap("{ leaf?: string }[]")
		})

		it("a composed schema whose refs need its own root is an error", () => {
			const leafy = jsonSchema({
				$defs: { leaf: { type: "string" } },
				type: "object",
				properties: { leaf: { $ref: "#/$defs/leaf" } }
			})
			// @ts-expect-error
			attest(() => jsonSchema({ type: "array", items: leafy })).type.errors(
				"Type '\"#/$defs/leaf\"' is not assignable to type '\"#\"'"
			)
		})

		it("composed boolean jsonSchema values", () => {
			attest<[]>(
				jsonSchema({ type: "array", items: jsonSchema(false) }).infer
			).type.toString.snap("[]")
			attest<unknown[]>(
				jsonSchema({ type: "array", items: jsonSchema(true) }).infer
			).type.toString.snap("unknown[]")
		})

		it("a composed widened jsonSchema value", () => {
			const loose = jsonSchema({} as JsonSchema)
			attest<{ a: unknown }>(
				jsonSchema({
					type: "object",
					properties: { a: loose },
					required: ["a"]
				}).infer
			).type.toString.snap("{ a: unknown }")
		})

		it("a composed union of jsonSchema values", () => {
			const s =
				Math.random() > 0.5 ?
					jsonSchema({ type: "string" })
				:	jsonSchema({ type: "number" })
			attest<(string | number)[]>(
				jsonSchema({ type: "array", items: s }).infer
			).type.toString.snap("(string | number)[]")
		})
	})
})

import { attest, contextualize } from "@ark/attest"
import { jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import type { Json } from "@ark/util"
import type { JsonSchema } from "arktype"

// checks inference without reading the schema at runtime
// like jsonSchemaToType, the result is read back with `infer` so attest's
// contextual type isn't inferred into jsonSchema.infer
const inferred = <const schema, r = jsonSchema.infer<schema>>(
	schema: jsonSchema.validate<schema>
): r extends infer _ ? _ : never => schema as never

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

contextualize(() => {
	describe("type names", () => {
		it("string", () => {
			const T = jsonSchemaToType({ type: "string" })
			attest<string>(T.infer).type.toString.snap("string")
		})

		it("number", () => {
			const T = jsonSchemaToType({ type: "number" })
			attest<number>(T.infer).type.toString.snap("number")
		})

		it("integer", () => {
			const T = jsonSchemaToType({ type: "integer" })
			attest<number>(T.infer).type.toString.snap("number")
		})

		it("boolean", () => {
			const T = jsonSchemaToType({ type: "boolean" })
			attest<boolean>(T.infer).type.toString.snap("boolean")
		})

		it("null", () => {
			const T = jsonSchemaToType({ type: "null" })
			attest<null>(T.infer).type.toString.snap("null")
		})

		it("object", () => {
			const T = jsonSchemaToType({ type: "object" })
			attest<object>(T.infer).type.toString.snap("object")
		})

		it("array", () => {
			const T = jsonSchemaToType({ type: "array" })
			attest<unknown[]>(T.infer).type.toString.snap("unknown[]")
		})

		it("keywords of other families are ignored", () => {
			const T = inferred({
				type: "string",
				properties: { a: { type: "number" } },
				required: ["a"],
				items: { type: "number" },
				minimum: 5
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("then/else without if don't affect a type", () => {
			attest<string>(
				inferred({
					type: "string",
					then: { type: "number" },
					else: { type: "boolean" }
				})
			).type.toString.snap("string")
		})

		it("union of schemas distributes", () => {
			attest<
				string | number,
				jsonSchema.infer<{ type: "string" } | { type: "number" }>
			>()
		})

		it("union of type names", () => {
			attest<string | null, jsonSchema.infer<{ type: "string" | "null" }>>()
		})

		it("optional type key", () => {
			attest<unknown, jsonSchema.infer<{ type?: "string" }>>()
		})
	})

	describe("type lists", () => {
		it("string or null", () => {
			const T = jsonSchemaToType({ type: ["string", "null"] })
			attest<string | null>(T.infer).type.toString.snap("string | null")
		})

		it("every type name", () => {
			const T = inferred({
				type: [
					"string",
					"integer",
					"number",
					"object",
					"array",
					"boolean",
					"null"
				]
			})
			attest<string | number | boolean | object | unknown[] | null>(T).type
				.toString.snap(`	| string
	| number
	| boolean
	| object
	| unknown[]
	| null`)
		})

		it("object and array branches with both keyword families", () => {
			const T = inferred({
				type: ["object", "array", "string"],
				properties: { a: { type: "number" } },
				items: { type: "boolean" },
				minLength: 1
			})
			attest<{ a?: number } | boolean[] | string>(T)
			attest(T).type.toString.snap("string | boolean[] | { a?: number }")
		})

		it("widened list", () => {
			attest<
				string | number | boolean | object | unknown[] | null,
				jsonSchema.infer<{ type: JsonSchema.TypeName[] }>
			>()
		})
	})

	describe("boolean schemas", () => {
		it("true", () => {
			const T = jsonSchemaToType(true)
			attest<unknown>(T.infer).type.toString.snap("unknown")
		})

		it("false", () => {
			const T = jsonSchemaToType(false)
			attest<never>(T.infer).type.toString.snap("never")
		})

		it("type with not false", () => {
			attest<string>(
				inferred({ type: "string", not: false })
			).type.toString.snap("string")
		})

		it("type with not true", () => {
			attest<never>(inferred({ type: "string", not: true })).type.toString.snap(
				"never"
			)
		})

		it("errors next to boolean list elements", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					anyOf: [false, { type: "strin" }]
				})
			).type.errors(`Type '"strin"' is not assignable to type 'TypeName'`)
			attest(() =>
				inferred({
					type: "array",
					// @ts-expect-error
					prefixItems: [false, { type: "strin" }]
				})
			).type.errors(`Type '"strin"' is not assignable to type 'TypeName'`)
		})

		it("completions next to boolean list elements", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					anyOf: [true, { type: "nu" }]
				})
			).completions({ nu: ["null", "number"] })
		})
	})

	describe("empty and annotation-only schemas", () => {
		it("empty object", () => {
			attest<unknown>(inferred({})).type.toString.snap("unknown")
		})

		it("every annotation", () => {
			const T = inferred({
				title: "t",
				description: "d",
				default: "x",
				examples: ["x"],
				deprecated: true,
				readOnly: true,
				writeOnly: false,
				$comment: "c",
				$schema: "https://json-schema.org/draft/2020-12/schema",
				$id: "https://example.com/s",
				$anchor: "s"
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("constraint keywords alone imply no type", () => {
			const T = inferred({
				minLength: 1,
				pattern: "^a",
				minimum: 0,
				multipleOf: 0.5,
				minItems: 1,
				uniqueItems: true,
				contains: { type: "string" },
				minProperties: 1,
				propertyNames: { minLength: 1 }
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("nullable true alone", () => {
			attest<unknown>(inferred({ nullable: true })).type.toString.snap(
				"unknown"
			)
		})

		it("schema-like annotation values aren't validated", () => {
			const T = inferred({
				default: { type: "strin" },
				examples: [{ type: 5 }],
				"x-schema": { minLength: -1 }
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("annotation values of any kind are accepted", () => {
			const T = inferred({
				type: "string",
				title: 5,
				description: { text: "d" },
				deprecated: "yes",
				$comment: null
			})
			attest<string>(T).type.toString.snap("string")
		})
	})

	describe("keyword completions", () => {
		it("annotation keywords", () => {
			attest(() =>
				// prettier-ignore
				inferred({ type: "string", "depr": true, "readO": true, "$com": "" })
			).completions({
				depr: ["deprecated"],
				readO: ["readOnly"],
				$com: ["$comment"]
			})
		})

		it("keywords in not", () => {
			attest(() =>
				// prettier-ignore
				inferred({ type: "string", not: { "cons": "a" } })
			).completions({ cons: ["const"] })
		})
	})

	describe("const", () => {
		it("string", () => {
			attest<"foo">(
				jsonSchemaToType({ const: "foo" }).infer
			).type.toString.snap('"foo"')
		})

		it("null", () => {
			attest<null>(jsonSchemaToType({ const: null }).infer).type.toString.snap(
				"null"
			)
		})

		it("empty object", () => {
			attest<{}>(inferred({ const: {} })).type.toString.snap("{}")
		})

		it("object", () => {
			attest<{ readonly a: 1; readonly b: "x" }>(
				jsonSchemaToType({ const: { a: 1, b: "x" } }).infer
			).type.toString.snap('{ readonly a: 1; readonly b: "x" }')
		})

		it("array", () => {
			attest<readonly [1, "a", null, true]>(
				jsonSchemaToType({ const: [1, "a", null, true] }).infer
			).type.toString.snap('readonly [1, "a", null, true]')
		})

		it("schema-like value isn't validated", () => {
			const T = inferred({
				const: { type: "strin", minLength: -1, $ref: "#/nope" }
			})
			attest<{
				readonly type: "strin"
				readonly minLength: -1
				readonly $ref: "#/nope"
			}>(T).type.toString.snap(`{
	readonly type: "strin"
	readonly minLength: -1
	readonly $ref: "#/nope"
}`)
		})

		it("widened", () => {
			attest<string, jsonSchema.infer<{ const: string }>>()
			attest<number, jsonSchema.infer<{ const: number }>>()
			attest<unknown, jsonSchema.infer<{ const: unknown }>>()
		})
	})

	describe("enum", () => {
		it("strings", () => {
			const T = jsonSchemaToType({ enum: ["a", "b", "c"] })
			attest<"a" | "b" | "c">(T.infer).type.toString.snap('"a" | "b" | "c"')
		})

		it("objects and arrays", () => {
			const T = inferred({ enum: [{ a: 1 }, [1, 2], "x"] })
			attest<{ readonly a: 1 } | readonly [1, 2] | "x">(T).type.toString.snap(
				'"x" | { readonly a: 1 } | readonly [1, 2]'
			)
		})

		it("empty", () => {
			attest<never>(inferred({ enum: [] })).type.toString.snap("never")
		})

		it("five hundred strings with type", () => {
			type values<acc extends string[]> =
				acc["length"] extends 500 ? acc : values<[...acc, `v${acc["length"]}`]>
			type range<n extends number, acc extends number[] = []> =
				acc["length"] extends n ? acc[number]
				:	range<n, [...acc, acc["length"]]>
			type T = jsonSchema.infer<{ type: "string"; enum: values<[]> }>
			attest<`v${range<500>}`, T>()
			attest<never>(
				{} as jsonSchema.infer<{ type: "number"; enum: values<[]> }>
			)
		})

		it("widened", () => {
			attest<string, jsonSchema.infer<{ enum: string[] }>>()
			attest<string | number, jsonSchema.infer<{ enum: (string | number)[] }>>()
			attest<unknown, jsonSchema.infer<{ enum: unknown[] }>>()
		})
	})

	describe("type and const", () => {
		it("string const", () => {
			attest<"a">(
				jsonSchemaToType({ type: "string", const: "a" }).infer
			).type.toString.snap('"a"')
		})

		it("string with number const", () => {
			attest<never>(inferred({ type: "string", const: 1 })).type.toString.snap(
				"never"
			)
		})

		it("integer with float const", () => {
			// integer-ness of a number literal isn't checked (constraints are invisible)
			attest<1.5>(inferred({ type: "integer", const: 1.5 })).type.toString.snap(
				"1.5"
			)
		})

		it("object with null const", () => {
			attest<never>(
				inferred({ type: "object", const: null })
			).type.toString.snap("never")
		})

		it("object const", () => {
			attest<{ readonly a: 1 }>(
				inferred({ type: "object", const: { a: 1 } })
			).type.toString.snap("{ readonly a: 1 }")
		})

		it("object with array const", () => {
			// TS's object includes arrays, so an object base doesn't filter them
			const T = inferred({ type: "object", const: [1] })
			attest<readonly [1]>(T).type.toString.snap("readonly [1]")
		})

		it("array with object const", () => {
			const T = inferred({ type: "array", const: { a: 1 } })
			attest<never>(T).type.toString.snap("never")
		})

		it("string with empty object const", () => {
			const T = inferred({ type: "string", const: {} })
			attest<never>(T).type.toString.snap("never")
		})

		it("object properties with const", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "number" } },
				required: ["a"],
				const: { a: 1 }
			})
			attest<{ readonly a: 1 }>(T).type.toString.snap("{ readonly a: 1 }")
		})

		it("array items with const", () => {
			const T = inferred({
				type: "array",
				items: { type: "number" },
				const: [1, 2]
			})
			attest<readonly [1, 2]>(T).type.toString.snap("readonly [1, 2]")
		})

		it("empty literals against the other domain", () => {
			attest<readonly []>(inferred({ type: "array", const: [] }))
			attest<{}>(inferred({ type: "object", const: {} }))
			attest(inferred({ type: "array", const: {} })).type.toString.snap("never")
		})
	})

	describe("type and enum", () => {
		it("string filters", () => {
			attest<"a" | "b">(
				jsonSchemaToType({ type: "string", enum: ["a", 1, "b", null] }).infer
			).type.toString.snap('"a" | "b"')
		})

		it("type list with object and array members", () => {
			const T = inferred({
				type: ["object", "null"],
				enum: [{ a: 1 }, null, "x"]
			})
			attest<{ readonly a: 1 } | null>(T).type.toString.snap(
				"{ readonly a: 1 } | null"
			)
		})

		it("empty enum with type", () => {
			attest<never>(inferred({ type: "string", enum: [] })).type.toString.snap(
				"never"
			)
		})
	})

	describe("nullable", () => {
		it("string", () => {
			attest<string | null>(
				inferred({ type: "string", nullable: true })
			).type.toString.snap("string | null")
		})

		it("enum", () => {
			attest<"a" | "b" | null>(
				inferred({ enum: ["a", "b"], nullable: true })
			).type.toString.snap('"a" | "b" | null')
		})

		it("false", () => {
			attest<string>(
				inferred({ type: "string", nullable: false })
			).type.toString.snap("string")
		})

		it("widened to boolean", () => {
			attest<
				string | null,
				jsonSchema.infer<{ type: "string"; nullable: boolean }>
			>()
		})

		it("may be undefined", () => {
			attest<
				string | null,
				jsonSchema.infer<{ type: "string"; nullable: true | undefined }>
			>()
			attest<
				string,
				jsonSchema.infer<{ type: "string"; nullable: false | undefined }>
			>()
		})

		it("with const and enum null", () => {
			attest<null>(inferred({ type: "string", nullable: true, const: null }))
			attest<null>(inferred({ type: "string", nullable: true, enum: [null] }))
			attest<1 | null>(inferred({ type: "integer", nullable: true, const: 1 }))
			attest<string>(
				inferred({
					type: "string",
					nullable: true,
					not: { enum: [null, "a"] }
				})
			)
		})

		it("must be a boolean", () => {
			// @ts-expect-error
			attest(() => inferred({ type: "string", nullable: "true" })).type.errors(
				"Type 'string' is not assignable to type 'boolean'"
			)
		})
	})

	describe("string keywords", () => {
		it("every string keyword", () => {
			const T = inferred({
				type: "string",
				minLength: 0,
				maxLength: 100,
				pattern: "^a",
				format: "uri",
				contentEncoding: "base64",
				contentMediaType: "text/plain"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("RegExp pattern", () => {
			attest(inferred({ type: "string", pattern: /a/ })).type.toString.snap(
				"string"
			)
		})
	})

	describe("number constraints", () => {
		it("every number keyword", () => {
			const T = jsonSchemaToType({
				type: "number",
				minimum: 0,
				exclusiveMaximum: 10,
				multipleOf: 2
			})
			attest<number>(T.infer).type.toString.snap("number")
		})

		it("minimum and exclusiveMinimum", () => {
			attest(
				inferred({ type: "number", minimum: 0, exclusiveMinimum: 0 })
			).type.toString.snap("number")
		})

		it("minimum and exclusiveMaximum are compatible", () => {
			attest<number>(
				inferred({ type: "number", minimum: 0, exclusiveMaximum: 1 })
			).type.toString.snap("number")
		})

		it("draft-04 boolean exclusiveMinimum", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "number", exclusiveMinimum: true })
			).type.errors(
				"boolean exclusiveMinimum isn't supported by jsonSchemaToType"
			)
		})

		it("multipleOf must be positive", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "number", multipleOf: 0 })
			).type.errors.snap(
				"Type 'number' is not assignable to type '\"multipleOf must be a positive number (was 0)​\"'."
			)
		})

		it("negative multipleOf", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "number", multipleOf: -2 })
			).type.errors.snap(
				"Type 'number' is not assignable to type '\"multipleOf must be a positive number (was -2)​\"'."
			)
		})
	})

	describe("count keywords", () => {
		it("zero is valid", () => {
			attest<string>(
				inferred({ type: "string", minLength: 0, maxLength: 0 })
			).type.toString.snap("string")
		})

		it("widened is valid", () => {
			const n: number = 1
			attest<string>(
				inferred({ type: "string", minLength: n })
			).type.toString.snap("string")
		})

		it("large", () => {
			attest<string>(inferred({ type: "string", maxLength: 1e21 }))
		})

		it("non-integer", () => {
			// @ts-expect-error
			attest(() => inferred({ type: "string", minLength: 1.5 })).type.errors(
				"minLength must be a non-negative integer (was 1.5)"
			)
		})

		it("negative maxLength", () => {
			// @ts-expect-error
			attest(() => inferred({ type: "string", maxLength: -5 })).type.errors(
				"maxLength must be a non-negative integer (was -5)"
			)
		})

		it("exponent-formatted fraction", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "string", minLength: 0.0000001 })
			).type.errors.snap(
				"Type 'number' is not assignable to type '\"minLength must be a non-negative integer (was 1e-7)​\"'."
			)
		})
	})

	describe("widened schemas", () => {
		it("JsonSchema variable", () => {
			const schema: JsonSchema = { type: "string" }
			attest<unknown>(inferred(schema)).type.toString.snap("unknown")
			attest<unknown>(jsonSchemaToType(schema).infer).type.toString.snap(
				"unknown"
			)
		})

		it("JsonSchema branches", () => {
			attest<string | null, jsonSchema.infer<JsonSchema.String>>()
			attest<number | null, jsonSchema.infer<JsonSchema.Numeric>>()
			attest<object, jsonSchema.infer<JsonSchema.Object>>()
			attest<unknown[] | null, jsonSchema.infer<JsonSchema.Array>>()
			attest<Json, jsonSchema.infer<JsonSchema.Const>>()
			attest<Json, jsonSchema.infer<JsonSchema.Enum>>()
			attest<unknown, jsonSchema.infer<JsonSchema.Constrainable>>()
			attest<unknown, jsonSchema.infer<JsonSchema.Branch>>()
		})

		it("non-const type", () => {
			const schema = { type: "string" }
			attest<unknown>(inferred(schema)).type.toString.snap("unknown")
		})

		it("non-const invalid type isn't an error", () => {
			const schema = { type: "strin" }
			attest<unknown>(inferred(schema)).type.toString.snap("unknown")
		})

		it("widened type in a type list", () => {
			const name: string = "string"
			attest<unknown>(inferred({ type: [name, "null"] })).type.toString.snap(
				"unknown"
			)
		})

		it("widened type with enum", () => {
			attest<"a" | 1, jsonSchema.infer<{ type: string; enum: ["a", 1] }>>()
		})

		it("JSONSchema7 value is valid", () => {
			const schema: JSONSchema7 = { type: "string" }
			attest(() => inferred(schema)).type.errors.is("")
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
	})

	describe("any, never and unknown", () => {
		it("any", () => {
			attest<any, jsonSchema.infer<any>>()
			attest<any>(inferred({} as any)).type.toString.snap("any")
		})

		it("never", () => {
			attest<[never], [jsonSchema.infer<never>]>()
		})

		it("unknown", () => {
			attest<unknown, jsonSchema.infer<unknown>>()
			attest<unknown>(inferred({} as unknown)).type.toString.snap("unknown")
		})

		it("any property", () => {
			const T = inferred({ type: "object", properties: { a: {} as any } })
			attest<{ a?: any }>(T)
			attest(T).type.toString.snap("{ a?: any }")
		})

		it("any prefixItems", () => {
			const T = inferred({ type: "array", prefixItems: [{} as any] })
			attest<[any?, ...unknown[]]>(T).type.toString.snap("[any?, ...unknown[]]")
		})

		it("any in anyOf", () => {
			const T = inferred({ anyOf: [{} as any] })
			attest<0 extends 1 & typeof T ? true : false>(true)
			attest(T).type.toString.snap("any")
		})

		it("any const", () => {
			attest<any>(inferred({ const: {} as any })).type.toString.snap("any")
		})

		it("any type name", () => {
			const T = inferred({ type: {} as any })
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("never type name", () => {
			// no value has a never type name, so the string shortcut is sound
			const T = inferred({ type: {} as never })
			attest<string>(T).type.toString.snap("string")
		})

		it("any $defs target", () => {
			const T = inferred({ $defs: { a: {} as any }, $ref: "#/$defs/a" })
			attest<0 extends 1 & typeof T ? true : false>(true)
			attest(T).type.toString.snap("any")
		})
	})

	describe("type validation", () => {
		it("int", () => {
			// @ts-expect-error
			attest(() => inferred({ type: "int" })).type.errors.snap(
				"Type '\"int\"' is not assignable to type 'TypeName'."
			)
		})

		it("number", () => {
			// @ts-expect-error
			attest(() => inferred({ type: 5 })).type.errors(
				"Type 'number' is not assignable to type 'TypeName'"
			)
		})

		it("empty list", () => {
			// @ts-expect-error
			attest(() => inferred({ type: [] })).type.errors.snap(
				"Type '[]' is not assignable to type 'readonly [TypeName, ...TypeName[]]'.Source has 0 element(s) but target requires 1."
			)
		})

		it("duplicate names are accepted", () => {
			attest(() => inferred({ type: ["string", "string"] })).type.errors.is("")
		})

		it("completes in list", () => {
			// @ts-expect-error
			attest(() => inferred({ type: ["string", "nu"] })).completions({
				nu: ["null", "number"]
			})
		})

		it("completes nested", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					properties: { a: { type: "bo" } }
				})
			).completions({ bo: ["boolean"] })
		})

		it("as const variable", () => {
			const schema = { type: "strin" } as const
			// @ts-expect-error
			attest(() => jsonSchemaToType(schema)).type.errors("not assignable")
		})
	})

	describe("const and enum validation", () => {
		it("enum can't be an object", () => {
			// @ts-expect-error
			attest(() => inferred({ enum: { a: 1 } })).type.errors(
				"'a' does not exist in type 'readonly unknown[]'"
			)
		})
	})

	describe("root values", () => {
		it("string", () => {
			// @ts-expect-error
			attest(() => jsonSchemaToType("string")).type.errors(
				"JSON Schema must be an object or a boolean (was string)"
			)
		})

		it("array", () => {
			// @ts-expect-error
			attest(() => inferred([{ type: "string" }])).type.errors(
				"JSON Schema must be an object or a boolean (was array)"
			)
		})
	})

	describe("not with primitives", () => {
		it("excludes a type from a list", () => {
			attest<number>(
				inferred({
					type: ["string", "number", "null"],
					not: { type: ["string", "null"] }
				})
			).type.toString.snap("number")
		})

		it("integer excludes number", () => {
			attest<never>(
				inferred({ type: "integer", not: { type: "number" } })
			).type.toString.snap("never")
		})

		it("number minus integer", () => {
			attest<number>(
				inferred({ type: "number", not: { type: "integer" } })
			).type.toString.snap("number")
		})

		it("integer literals aren't excluded by not integer", () => {
			// limitation: TS can't express integers, so `type: "integer"` rejects nothing in a negation (sound but imprecise)
			attest<1 | 2>(
				inferred({ enum: [1, 2], not: { type: "integer" } })
			).type.toString.snap("1 | 2")
		})

		it("array minus object", () => {
			attest<unknown[]>(
				inferred({ type: "array", not: { type: "object" } })
			).type.toString.snap("unknown[]")
		})

		it("list minus object and array", () => {
			attest<string>(
				inferred({
					type: ["object", "array", "string"],
					not: { type: ["object", "array"] }
				})
			).type.toString.snap("string")
		})

		it("const excluded from enum", () => {
			attest<1 | 3>(
				jsonSchemaToType({ enum: [1, 2, 3], not: { const: 2 } }).infer
			).type.toString.snap("1 | 3")
		})

		it("enum excluded from enum", () => {
			attest<"a">(
				inferred({ enum: ["a", "b", null], not: { enum: ["b", null] } })
			).type.toString.snap('"a"')
		})

		it("const excluded from type", () => {
			attest<number>(
				inferred({ type: "number", not: { const: 0 } })
			).type.toString.snap("number")
		})

		it("not with unknown base", () => {
			attest<number | boolean | object | unknown[] | null>(
				inferred({ not: { type: "string" } })
			).type.toString.snap("number | boolean | object | unknown[] | null")
		})

		it("a negation of every primitive", () => {
			attest<string | number | object | unknown[]>(
				inferred({ not: { enum: [null, true, false] } })
			).type.toString.snap("string | number | object | unknown[]")
		})

		it("nullable with not null", () => {
			attest<string>(
				inferred({ type: "string", nullable: true, not: { type: "null" } })
			).type.toString.snap("string")
		})
	})

	describe("composition of primitives", () => {
		it("allOf of disjoint types", () => {
			attest<never>(
				inferred({ allOf: [{ type: "string" }, { type: "number" }] })
			).type.toString.snap("never")
		})

		it("allOf of type lists", () => {
			attest<null>(
				inferred({
					allOf: [{ type: ["string", "null"] }, { type: ["null", "number"] }]
				})
			).type.toString.snap("null")
		})

		it("type with anyOf of consts", () => {
			attest<"a">(
				inferred({ type: "string", anyOf: [{ const: "a" }, { const: 1 }] })
			).type.toString.snap('"a"')
		})

		it("enum with allOf", () => {
			attest<"a" | "b">(
				inferred({
					enum: ["a", "b", 1],
					allOf: [{ type: "string" }]
				})
			).type.toString.snap('"a" | "b"')
		})
	})

	describe("not with object and array literals", () => {
		it("an empty object literal only excludes the empty object", () => {
			attest<string>(
				inferred({ type: "string", not: { const: {} } })
			).type.toString.snap("string")
			attest<number>(
				inferred({ type: "number", not: { enum: [{}] } })
			).type.toString.snap("number")
		})

		it("an object literal doesn't exclude an open object type", () => {
			const T = inferred({
				type: "object",
				properties: { a: { const: 1 } },
				required: ["a"],
				not: { const: { a: 1 } }
			})
			attest<{ a: 1 }>(T).type.toString.snap("{ a: 1 }")
		})

		it("an object literal doesn't exclude a literal with more keys", () => {
			const T = inferred({
				enum: [{ a: 1, b: 2 }],
				not: { const: { a: 1 } }
			})
			attest<{ readonly a: 1; readonly b: 2 }>(T).type.toString.snap(
				"{ readonly a: 1; readonly b: 2 }"
			)
		})

		it("an array literal with an object element doesn't exclude a tuple", () => {
			const T = inferred({
				type: "array",
				prefixItems: [{ type: "string" }],
				minItems: 1,
				items: false,
				not: { const: [{}] }
			})
			attest<[string]>(T).type.toString.snap("[string]")
		})

		it("an empty object literal with an object type only excludes the empty object", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "number" } },
				required: ["a"],
				not: { type: "object", const: {} }
			})
			attest<{ a: number }>(T).type.toString.snap("{ a: number }")
		})

		it("equal literals are excluded", () => {
			attest<readonly [1, 2]>(
				inferred({ enum: [[1, 2], [1]], not: { const: [1] } })
			).type.toString.snap("readonly [1, 2]")
			const T = inferred({ type: "array", items: false, not: { const: [] } })
			attest<never>(T).type.toString.snap("never")
		})
	})

	describe("not with widened or union values", () => {
		it("non-const const variable", () => {
			const forbidden = { const: "admin" }
			attest<string>(
				inferred({ type: "string", not: forbidden })
			).type.toString.snap("string")
		})

		it("non-const enum variable", () => {
			const forbidden = { enum: ["admin", "root"] }
			attest<string>(
				inferred({ type: "string", not: forbidden })
			).type.toString.snap("string")
		})

		it("widened boolean const", () => {
			const T = {} as jsonSchema.infer<{
				type: "boolean"
				not: { const: boolean }
			}>
			attest<boolean>(T).type.toString.snap("boolean")
		})

		it("any or unknown const and enum", () => {
			const T = {} as jsonSchema.infer<{ type: "string"; not: { const: any } }>
			attest<string>(T).type.toString.snap("string")
			const U = {} as jsonSchema.infer<{ type: "string"; not: { enum: any } }>
			attest<string>(U).type.toString.snap("string")
			const V = {} as jsonSchema.infer<{
				type: "string"
				not: { const: unknown }
			}>
			attest<string>(V).type.toString.snap("string")
		})

		it("branded and pattern consts reject nothing", () => {
			attest<
				string,
				jsonSchema.infer<{ type: "string"; not: { const: string & {} } }>
			>()
			attest<
				string,
				jsonSchema.infer<{
					type: "string"
					not: { const: "a" | (string & {}) }
				}>
			>()
			attest<
				string,
				jsonSchema.infer<{ type: "string"; not: { const: Uppercase<string> } }>
			>()
			attest<
				string,
				jsonSchema.infer<{ type: "string"; not: { const: `a${string}b` } }>
			>()
			attest<
				false,
				jsonSchema.infer<{ type: "boolean"; not: { const: true & {} } }>
			>()
		})

		it("not that may be undefined", () => {
			const T = {} as jsonSchema.infer<{
				type: "string"
				not: { type: "string" } | undefined
			}>
			attest<string>(T).type.toString.snap("string")
		})

		it("widened subschemas exclude nothing", () => {
			attest<string, jsonSchema.infer<{ type: "string"; not: JsonSchema }>>()
			attest<
				string,
				jsonSchema.infer<{ type: "string"; not: JsonSchema.Const }>
			>()
			attest<
				string,
				jsonSchema.infer<{ type: "string"; not: Record<string, unknown> }>
			>()
			attest<
				string,
				jsonSchema.infer<{ type: "string"; not: { type: string } }>
			>()
		})

		it("widened and union lists", () => {
			const T = {} as jsonSchema.infer<{
				type: ["string", "number"]
				not: { type: readonly ("string" | "number")[] }
			}>
			attest<string | number>(T).type.toString.snap("string | number")
			const U = {} as jsonSchema.infer<{
				type: ["string", "number"]
				not: { type: ["string"] | ["number"] }
			}>
			attest<string | number>(U).type.toString.snap("string | number")
			const V = {} as jsonSchema.infer<{
				enum: ["a", "b"]
				not: { enum: ["a"] | ["b"] }
			}>
			attest<"a" | "b">(V).type.toString.snap('"a" | "b"')
			const W = {} as jsonSchema.infer<{
				type: "string"
				not: { type: "string"; const: string }
			}>
			attest<string>(W).type.toString.snap("string")
		})

		it("an optional keyword excludes its value either way", () => {
			const T = {} as jsonSchema.infer<{
				enum: ["a", "b"]
				not: { const?: "a" }
			}>
			attest<"b">(T).type.toString.snap('"b"')
		})

		it("union elements of a negated list", () => {
			const T = {} as jsonSchema.infer<{
				type: ["string", "boolean"]
				not: { type: ["boolean" | "string"] }
			}>
			attest<string | boolean>(T).type.toString.snap("string | boolean")
			const U = {} as jsonSchema.infer<{
				enum: ["a", "b", 1]
				not: { enum: ["a" | 1, "b"] }
			}>
			attest<"a" | 1>(U).type.toString.snap('"a" | 1')
		})

		it("tuple consts that aren't a single value", () => {
			const T = {} as jsonSchema.infer<{
				enum: [[], [1]]
				not: { const: [1?] }
			}>
			attest<[] | [1]>(T).type.toString.snap("[] | [1]")
			const U = {} as jsonSchema.infer<{
				enum: [["a"], ["b"]]
				not: { const: ["a" | "b"] }
			}>
			attest<["a"] | ["b"]>(U).type.toString.snap('["a"] | ["b"]')
			const V = {} as jsonSchema.infer<{
				enum: [[1], [1, 2]]
				not: { const: number[] }
			}>
			attest<[1] | [1, 2]>(V).type.toString.snap("[1] | [1, 2]")
		})
	})

	describe("not exactness", () => {
		it("an empty negation and a negated empty enum", () => {
			attest(inferred({ type: "string", not: {} })).type.toString.snap("never")
			attest<string>(inferred({ type: "string", not: { enum: [] } }))
		})

		it("not array excludes readonly array literals", () => {
			const T = inferred({ enum: [[1], "a"], not: { type: "array" } })
			attest<"a">(T).type.toString.snap('"a"')
		})

		it("annotations don't make a negation inexact", () => {
			const T = inferred({
				type: ["string", "null"],
				not: { type: "null", description: "no nulls" }
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("an unknown keyword makes a negation inexact", () => {
			attest<string | null>(
				{} as jsonSchema.infer<{
					type: ["string", "null"]
					not: { type: "null"; "x-a": 1 }
				}>
			).type.toString.snap("string | null")
		})

		it("not object removes objects with index signatures", () => {
			attest<string>(
				inferred({
					type: ["object", "string"],
					additionalProperties: { type: "string" },
					not: { type: "object" }
				})
			).type.toString.snap("string")
		})

		it("type and const or enum in one negation", () => {
			attest<
				string,
				jsonSchema.infer<{
					type: "string"
					not: { type: "string"; enum: ["a", 1] }
				}>
			>()
			attest<
				string | number,
				jsonSchema.infer<{
					type: ["string", "number"]
					not: { type: ["number"]; enum: ["a", 1] }
				}>
			>()
			attest<
				"b",
				jsonSchema.infer<{
					enum: ["a", "b"]
					not: { enum: ["a"] } & { const: "a" }
				}>
			>()
			attest<
				"a" | "b",
				jsonSchema.infer<{
					enum: ["a", "b"]
					not: { const: "a"; enum: ["b"] }
				}>
			>()
		})

		it("strings and numbers JSON compares by value", () => {
			attest<"a">(
				inferred({ enum: ["__proto__", "a"], not: { const: "__proto__" } })
			).type.toString.snap('"a"')
			attest<"a">(
				inferred({ enum: ["toString", "a"], not: { const: "toString" } })
			).type.toString.snap('"a"')
			attest<"a">(
				inferred({ enum: ["", "a"], not: { const: "" } })
			).type.toString.snap('"a"')
			attest<1>(
				inferred({ enum: [0, 1], not: { const: -0 } })
			).type.toString.snap("1")
			attest<"1">(
				inferred({ enum: ["1", 1], not: { const: 1 } })
			).type.toString.snap('"1"')
			attest<2>(
				inferred({ enum: [1e21, 2], not: { const: 1000000000000000000000 } })
			).type.toString.snap("2")
			attest<"-0">(
				inferred({ enum: ["-0", 0], not: { const: 0 } })
			).type.toString.snap('"-0"')
		})

		it("an unsatisfiable negation rejects nothing", () => {
			attest<
				string,
				jsonSchema.infer<{ type: "string"; not: { type: "string"; const: 1 } }>
			>()
			attest<
				string | number,
				jsonSchema.infer<{ type: ["string", "number"]; not: { type: [] } }>
			>()
		})
	})

	describe("any keyword values and parts", () => {
		it("any type with siblings", () => {
			const T = {} as jsonSchema.infer<{ type: any; nullable: true }>
			attest<unknown>(T).type.toString.snap("unknown")
			const U = {} as jsonSchema.infer<{
				type: any
				$id: "https://example.com/s"
			}>
			attest<unknown>(U).type.toString.snap("unknown")
			const V = {} as jsonSchema.infer<{
				type: any
				not: { type: "string" }
			}>
			attest<number | boolean | object | unknown[] | null>(
				V
			).type.toString.snap("number | boolean | object | unknown[] | null")
		})

		it("any keyword values beside a type", () => {
			attest<string, jsonSchema.infer<{ type: "string"; const: any }>>()
			attest<string, jsonSchema.infer<{ type: "string"; enum: any }>>()
			attest<string, jsonSchema.infer<{ type: "string"; allOf: any }>>()
			attest<string, jsonSchema.infer<{ type: "string"; anyOf: any }>>()
			attest<string, jsonSchema.infer<{ type: "string"; $ref: any }>>()
			attest<string, jsonSchema.infer<{ type: "string"; not: any }>>()
			attest<
				string | null,
				jsonSchema.infer<{ type: "string"; nullable: any }>
			>()
		})

		it("an any part beside one other part is dropped", () => {
			attest<string, jsonSchema.infer<{ type: "string"; allOf: [any] }>>()
			attest<string, jsonSchema.infer<{ allOf: [any, { type: "string" }] }>>()
			attest<string, jsonSchema.infer<{ type: "string"; anyOf: [any] }>>()
			attest<
				string,
				jsonSchema.infer<{
					type: "string"
					if: { const: "a" }
					then: any
					else: any
				}>
			>()
			attest<
				"a",
				jsonSchema.infer<{ allOf: [{ type: "string" }, any, { const: "a" }] }>
			>()
		})

		it("an any part beside two other parts", () => {
			attest<"a">(
				{} as jsonSchema.infer<{ type: "string"; allOf: [any]; const: "a" }>
			).type.toString.snap('"a"')
			attest<"a">(
				{} as jsonSchema.infer<{ type: "string"; anyOf: [any]; enum: ["a", 1] }>
			).type.toString.snap('"a"')
			attest<"a">(
				{} as jsonSchema.infer<{
					type: "string"
					if: { const: "a" }
					then: any
					else: any
					const: "a"
				}>
			).type.toString.snap('"a"')
		})

		it("a ref to an any definition beside a type", () => {
			attest<string>(
				{} as jsonSchema.infer<{
					$ref: "#/$defs/a"
					$defs: { a: any }
					type: "string"
				}>
			).type.toString.snap("string")
		})
	})

	describe("hand-written keyword values", () => {
		it("optional const and enum", () => {
			attest<string, jsonSchema.infer<{ type: "string"; enum?: ["a"] }>>()
			attest<
				string | null,
				jsonSchema.infer<{ type: "string"; const?: "a"; nullable?: boolean }>
			>()
			attest<"a", jsonSchema.infer<{ type?: "string"; const: "a" }>>()
		})

		it("conditional keywords that may be absent", () => {
			attest<
				string,
				jsonSchema.infer<{
					type: "string"
					if?: { const: "a" }
					then: { const: "a" }
					else: { const: "b" }
				}>
			>()
			attest<
				string,
				jsonSchema.infer<{
					type: "string"
					if: { const: "a" }
					then?: { const: "a" }
					else: { const: "b" }
				}>
			>()
		})

		it("if that may be undefined", () => {
			const T = {} as jsonSchema.infer<{
				type: "string"
				if: { const: "a" } | undefined
				then: { const: "a" }
				else: { const: "b" }
			}>
			attest<string>(T).type.toString.snap("string")
			const U = {} as jsonSchema.infer<{
				type: "string"
				if: undefined
				then: { const: "a" }
				else: { const: "b" }
			}>
			attest<string>(U).type.toString.snap("string")
		})

		it("unknown keyword values contribute nothing", () => {
			attest<string, jsonSchema.infer<{ type: "string"; not: unknown }>>()
			attest<
				string,
				jsonSchema.infer<{
					type: "string"
					if: unknown
					then: { const: "a" }
					else: { const: "b" }
				}>
			>()
			attest<
				string,
				jsonSchema.infer<{
					type: "string"
					if: { const: "a" }
					then: unknown
					else: { const: "b" }
				}>
			>()
			attest<string, jsonSchema.infer<{ type: "string"; const: unknown }>>()
			attest<string, jsonSchema.infer<{ type: "string"; enum: unknown }>>()
			attest<"a", jsonSchema.infer<{ type: unknown; const: "a" }>>()
			attest<
				string | null,
				jsonSchema.infer<{ type: "string"; nullable: unknown }>
			>()
			attest<string, jsonSchema.infer<{ type: "string"; allOf: unknown }>>()
			attest<string, jsonSchema.infer<{ type: "string"; anyOf: unknown }>>()
		})

		it("keyword values that may be undefined contribute nothing", () => {
			attest<
				string,
				jsonSchema.infer<{
					type: "string"
					oneOf: [{ const: "a" }] | undefined
				}>
			>()
			attest<
				string,
				jsonSchema.infer<{
					type: "string"
					allOf: [{ const: "a" }] | undefined
				}>
			>()
			attest<
				string,
				jsonSchema.infer<{
					type: "string"
					if: { const: "a" }
					then: { const: "a" } | undefined
					else: { const: "b" }
				}>
			>()
			attest<
				string,
				jsonSchema.infer<{
					type: "string"
					if: true
					then: { const: "a" } | undefined
					else: { const: "b" }
				}>
			>()
			attest<
				string,
				jsonSchema.infer<{
					type: "string"
					enum: ["a"] | undefined
					const: "b" | undefined
				}>
			>()
		})

		it("union keyword values distribute", () => {
			attest<
				"a" | "b",
				jsonSchema.infer<{
					type: "string"
					anyOf: [{ const: "a" }] | [{ const: "b" }]
				}>
			>()
			attest<
				"a" | "b",
				jsonSchema.infer<{
					type: "string"
					allOf: [{ const: "a" }] | [{ const: "b" }, { const: "b" }]
				}>
			>()
		})

		it("never subschemas in lists", () => {
			attest<[never], [jsonSchema.infer<{ type: "string"; anyOf: [never] }>]>()
			attest<[never], [jsonSchema.infer<{ type: "string"; allOf: [never] }>]>()
		})

		it("never-valued keywords are vacuous", () => {
			attest<string, jsonSchema.infer<{ type: "string"; enum: never }>>()
			attest<string, jsonSchema.infer<{ type: "string"; const: never }>>()
			attest<string, jsonSchema.infer<{ type: "string"; not: never }>>()
			attest<string, jsonSchema.infer<{ type: "string"; nullable: never }>>()
		})

		it("rest elements in composition lists", () => {
			attest<
				string | number,
				jsonSchema.infer<{
					anyOf: [...{ type: "number" }[], { type: "string" }]
				}>
			>()
			attest<
				"a",
				jsonSchema.infer<{ type: "string"; enum: [...number[], "a"] }>
			>()
			attest<
				string | null,
				jsonSchema.infer<{ type: [..."null"[], "string"] }>
			>()
		})

		it("optional enum beside a required const is valid", () => {
			const schema = { type: "string", const: "a" } as {
				type: "string"
				const: "a"
				enum?: readonly ["a"]
			}
			attest(() => inferred(schema)).type.errors.is("")
			attest<"a">(inferred(schema)).type.toString.snap('"a"')
		})

		it("optional additionalItems beside non-array items is valid", () => {
			const schema = { type: "array", items: { type: "string" } } as {
				type: "array"
				items: { type: "string" }
				additionalItems?: false
			}
			attest(() => inferred(schema)).type.errors.is("")
			attest<string[]>(inferred(schema)).type.toString.snap("string[]")
		})
	})

	describe("conditionals on primitives", () => {
		it("widened if takes both branches", () => {
			attest<
				"a" | "b",
				jsonSchema.infer<{
					type: "string"
					if: boolean
					then: { const: "a" }
					else: { const: "b" }
				}>
			>()
			attest<
				"a" | "b",
				jsonSchema.infer<{
					type: "string"
					if: any
					then: { const: "a" }
					else: { const: "b" }
				}>
			>()
		})

		it("branches filter a type list", () => {
			attest<"a" | 1>(
				inferred({
					type: ["string", "number"],
					if: { type: "string" },
					then: { const: "a" },
					else: { const: 1 }
				})
			)
		})

		it("boolean if selects a branch", () => {
			attest<"a">(
				inferred({
					type: "string",
					if: true,
					then: { const: "a" },
					else: { const: "b" }
				})
			)
			attest<"b">(
				inferred({
					type: "string",
					if: false,
					then: { const: "a" },
					else: { const: "b" }
				})
			)
			attest(
				inferred({ type: "string", if: true, then: false, else: true })
			).type.toString.snap("never")
		})

		it("a conditional without a base", () => {
			attest<number | "a">(
				inferred({
					if: { type: "string" },
					then: { const: "a" },
					else: { type: "number" }
				})
			)
		})
	})

	describe("structured const and enum values", () => {
		it("a nested array is not an object", () => {
			const T = inferred({
				type: "array",
				items: { type: "object" },
				const: [[]]
			})
			attest<never>(T).type.toString.snap("never")
		})

		it("cross-domain enum with a composition", () => {
			attest<1>(
				inferred({
					allOf: [{ enum: ["a", 1, [1], { a: 1 }] }, { type: "integer" }]
				})
			).type.toString.snap("1")
			attest<{ readonly a: 1 } | readonly [1]>(
				inferred({
					enum: [{ a: 1 }, [1]],
					anyOf: [{ type: "object" }, { type: "string" }]
				})
			).type.toString.snap("{ readonly a: 1 } | readonly [1]")
			attest<readonly [1]>(
				inferred({ enum: [{ a: 1 }, [1]], oneOf: [{ type: "array" }] })
			).type.toString.snap("readonly [1]")
		})

		it("implied array keywords filter an enum", () => {
			attest<readonly ["a"] | readonly [1] | "x" | { readonly b: 1 }>(
				inferred({
					items: { type: "string" },
					enum: [["a"], [1], { b: 1 }, "x"]
				})
			)
		})

		it("a widened object const may be an array", () => {
			attest<unknown[]>(
				{} as jsonSchema.infer<{ type: "array"; const: object }>
			).type.toString.snap("unknown[]")
			attest<unknown[]>(
				{} as jsonSchema.infer<{ type: "array"; enum: object[] }>
			).type.toString.snap("unknown[]")
			attest<object | unknown[]>(
				{} as jsonSchema.infer<{ const: object }>
			).type.toString.snap("object | unknown[]")
			attest<"a" | object | unknown[]>(
				{} as jsonSchema.infer<{ enum: (object | "a")[] }>
			).type.toString.snap('"a" | object | unknown[]')
		})

		it("widened structured values are filtered by domain", () => {
			attest<
				object,
				jsonSchema.infer<{ type: ["array", "object"]; const: object }>
			>()
			attest<[never], [jsonSchema.infer<{ type: "string"; const: object }>]>()
			attest<
				unknown[],
				jsonSchema.infer<{ type: "object"; const: unknown[] }>
			>()
			attest<
				string[],
				jsonSchema.infer<{
					type: "array"
					items: { type: "string" }
					const: unknown[]
				}>
			>()
		})
	})

	describe("hand-written consts with optional members", () => {
		it("an optional const property", () => {
			attest(
				{} as jsonSchema.infer<{
					type: "object"
					properties: { a: { type: "string" } }
					const: { a?: number }
				}>
			).type.toString.snap("{ a?: never }")
		})

		it("an optional const element", () => {
			attest(
				{} as jsonSchema.infer<{
					type: "array"
					items: { type: "string" }
					const: [number?]
				}>
			).type.toString.snap("[]")
		})

		it("an unknown const property", () => {
			attest(
				{} as jsonSchema.infer<{
					type: "object"
					properties: { a: { type: "object" } }
					const: { a: unknown }
				}>
			).type.toString.snap("{ a: object }")
		})

		it("optional members the base admits", () => {
			attest<
				[string?],
				jsonSchema.infer<{
					type: "array"
					items: { type: "string" }
					const: [string?]
				}>
			>()
			attest<
				{ a: string; b?: number },
				jsonSchema.infer<{
					type: "object"
					properties: { a: { type: "string" } }
					required: ["a"]
					const: { b?: number }
				}>
			>()
			attest<
				{ a: string },
				jsonSchema.infer<{
					type: "object"
					properties: { a: { type: "string" } }
					required: ["a"]
					const: { a?: string }
				}>
			>()
		})
	})

	describe("literal property keys", () => {
		it("a property named with the null character", () => {
			attest<{ "\u0000"?: string; b: number }>(
				inferred({
					type: "object",
					properties: { "\u0000": { type: "string" }, b: { type: "number" } },
					additionalProperties: false,
					required: ["b"]
				})
			).type.toString.snap('{ "\\0"?: string; b: number }')
		})

		it("a numeric literal key the base rejects", () => {
			const T = inferred({
				type: "object",
				properties: { "1": { type: "string" } },
				required: ["1"],
				enum: [{ 1: "x" }, { 1: 2 }]
			})
			attest<{ readonly 1: "x" } | { 1: never }>(T).type.toString.snap(
				'{ 1: never } | { readonly 1: "x" }'
			)
		})
	})

	describe("hand-written optional prefix elements", () => {
		it("an optional element minItems requires, with no rest", () => {
			// without a rest, an absent element leaves no array long enough
			attest<[string, number]>(
				{} as jsonSchema.infer<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" }?]
					minItems: 2
					items: false
				}>
			).type.toString.snap("[string, number]")
			attest<never>(
				{} as jsonSchema.infer<{
					type: "array"
					prefixItems: [{ type: "string" }?]
					minItems: 1
					items: false
					enum: [[1], []]
				}>
			).type.toString.snap("never")
			attest<[string, number, string?]>(
				{} as jsonSchema.infer<{
					type: "array"
					prefixItems: [
						{ type: "string" },
						{ type: "number" }?,
						{ type: "string" }?
					]
					minItems: 2
					items: false
				}>
			).type.toString.snap("[string, number, string?]")
		})

		it("optional elements with a rest or a smaller minItems", () => {
			attest<
				[string, unknown, ...unknown[]],
				jsonSchema.infer<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" }?]
					minItems: 2
				}>
			>()
			attest<
				[string?, number?],
				jsonSchema.infer<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" }?]
					items: false
				}>
			>()
			attest<
				[string, number],
				jsonSchema.infer<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" } | undefined]
					minItems: 2
					items: false
				}>
			>()
			attest<
				[string, ...number[]],
				jsonSchema.infer<{
					type: "array"
					prefixItems: [{ type: "string" }, ...{ type: "number" }[]]
					minItems: 2
					items: false
				}>
			>()
		})

		it("hand-written minItems values", () => {
			attest<
				[string] | [string?],
				jsonSchema.infer<{
					type: "array"
					prefixItems: [{ type: "string" }]
					minItems: 1 | 0
					items: false
				}>
			>()
			attest<
				[string?, number?],
				jsonSchema.infer<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" }]
					minItems?: 2
					items: false
				}>
			>()
			attest<
				[string?, number?],
				jsonSchema.infer<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" }]
					minItems: 2 | undefined
					items: false
				}>
			>()
		})
	})

	describe("structured literals against recursive nodes", () => {
		it("const and enum through a ref and its siblings", () => {
			const T = inferred({
				$ref: "#/$defs/s",
				$defs: { s: { type: "string" } },
				const: 1
			})
			attest<[never], [typeof T]>()
			// beside a ref, an enum with a structured member isn't filtered at all
			attest<"a" | 1 | null | readonly [1]>(
				inferred({
					$ref: "#/$defs/s",
					$defs: { s: { type: "string" } },
					enum: ["a", 1, null, [1]]
				})
			).type.toString.snap('"a" | 1 | readonly [1] | null')
			attest<1 | "a">(
				inferred({
					$ref: "#/$defs/b",
					$defs: { b: true },
					enum: [1, "a"]
				})
			)
			const U = inferred({
				$ref: "#/$defs/b",
				$defs: { b: false },
				enum: [1, "a"]
			})
			attest<[never], [typeof U]>()
		})
	})

	describe("structured literals against nested bases", () => {
		it("const tuple the base rejects nested sixteen deep", () => {
			// prettier-ignore
			type T = jsonSchema.infer<{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "string" }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false; const: [[[[[[[[[[[[[[[[1]]]]]]]]]]]]]]]] }>
			const isAny = {} as 0 extends 1 & T ? true : false
			attest(isAny).type.toString.snap("false")
			// prettier-ignore
			attest({} as T).type.toString.snap("never")
		})

		it("const array checked against items nested thirty-two deep", () => {
			// prettier-ignore
			type T = jsonSchema.infer<{ type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "string" } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } }; const: [[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[["x"]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]] }>
			// prettier-ignore
			attest<[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[["x"]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]], T>()
		})

		it("const tuple checked against prefixItems nested thirty-two deep", () => {
			// prettier-ignore
			type T = jsonSchema.infer<{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "array"; prefixItems: [{ type: "string" }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false }]; items: false; const: [[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[["x"]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]] }>
			// prettier-ignore
			attest<[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[["x"]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]], T>()
		})

		it("not with a const array against items nested thirty-two deep", () => {
			// limitation: an exact not with a nested array literal raises a circularity error (TS5115) from 23 levels, 24 before TS 7 (the inferred type is still right)
			attest(() => {
				// prettier-ignore
				type T = jsonSchema.infer<{ type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "array"; items: { type: "string" } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } }; not: { const: [[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[["x"]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]] } }>
				// @ts-ignore
				return {} as T
			}).type.errors("appear infinitely circular")
		})
	})

	describe("allOf of conditionals reached through refs or nested allOf", () => {
		// prettier-ignore
		type Direct = jsonSchema.infer<{ type: "object"; allOf: [{ if: { properties: { k0: { const: "a" } }; required: ["k0"] }; then: { properties: { v0: { type: "string" } }; required: ["v0"] }; else: { properties: { v0: { type: "number" } }; required: ["v0"] } }, { if: { properties: { k1: { const: "a" } }; required: ["k1"] }; then: { properties: { v1: { type: "string" } }; required: ["v1"] }; else: { properties: { v1: { type: "number" } }; required: ["v1"] } }, { if: { properties: { k2: { const: "a" } }; required: ["k2"] }; then: { properties: { v2: { type: "string" } }; required: ["v2"] }; else: { properties: { v2: { type: "number" } }; required: ["v2"] } }, { if: { properties: { k3: { const: "a" } }; required: ["k3"] }; then: { properties: { v3: { type: "string" } }; required: ["v3"] }; else: { properties: { v3: { type: "number" } }; required: ["v3"] } }, { if: { properties: { k4: { const: "a" } }; required: ["k4"] }; then: { properties: { v4: { type: "string" } }; required: ["v4"] }; else: { properties: { v4: { type: "number" } }; required: ["v4"] } }, { if: { properties: { k5: { const: "a" } }; required: ["k5"] }; then: { properties: { v5: { type: "string" } }; required: ["v5"] }; else: { properties: { v5: { type: "number" } }; required: ["v5"] } }] }>

		it("rules through refs count toward the union limit", () => {
			// prettier-ignore
			type T = jsonSchema.infer<{ type: "object"; $defs: { r0: { if: { properties: { k0: { const: "a" } }; required: ["k0"] }; then: { properties: { v0: { type: "string" } }; required: ["v0"] }; else: { properties: { v0: { type: "number" } }; required: ["v0"] } }; r1: { if: { properties: { k1: { const: "a" } }; required: ["k1"] }; then: { properties: { v1: { type: "string" } }; required: ["v1"] }; else: { properties: { v1: { type: "number" } }; required: ["v1"] } }; r2: { if: { properties: { k2: { const: "a" } }; required: ["k2"] }; then: { properties: { v2: { type: "string" } }; required: ["v2"] }; else: { properties: { v2: { type: "number" } }; required: ["v2"] } }; r3: { if: { properties: { k3: { const: "a" } }; required: ["k3"] }; then: { properties: { v3: { type: "string" } }; required: ["v3"] }; else: { properties: { v3: { type: "number" } }; required: ["v3"] } }; r4: { if: { properties: { k4: { const: "a" } }; required: ["k4"] }; then: { properties: { v4: { type: "string" } }; required: ["v4"] }; else: { properties: { v4: { type: "number" } }; required: ["v4"] } }; r5: { if: { properties: { k5: { const: "a" } }; required: ["k5"] }; then: { properties: { v5: { type: "string" } }; required: ["v5"] }; else: { properties: { v5: { type: "number" } }; required: ["v5"] } } }; allOf: [{ $ref: "#/$defs/r0" }, { $ref: "#/$defs/r1" }, { $ref: "#/$defs/r2" }, { $ref: "#/$defs/r3" }, { $ref: "#/$defs/r4" }, { $ref: "#/$defs/r5" }] }>
			attest<Direct, T>()
		})

		it("rules in nested allOf count toward the union limit", () => {
			// prettier-ignore
			type T = jsonSchema.infer<{ type: "object"; allOf: [{ allOf: [{ if: { properties: { k0: { const: "a" } }; required: ["k0"] }; then: { properties: { v0: { type: "string" } }; required: ["v0"] }; else: { properties: { v0: { type: "number" } }; required: ["v0"] } }] }, { allOf: [{ if: { properties: { k1: { const: "a" } }; required: ["k1"] }; then: { properties: { v1: { type: "string" } }; required: ["v1"] }; else: { properties: { v1: { type: "number" } }; required: ["v1"] } }] }, { allOf: [{ if: { properties: { k2: { const: "a" } }; required: ["k2"] }; then: { properties: { v2: { type: "string" } }; required: ["v2"] }; else: { properties: { v2: { type: "number" } }; required: ["v2"] } }] }, { allOf: [{ if: { properties: { k3: { const: "a" } }; required: ["k3"] }; then: { properties: { v3: { type: "string" } }; required: ["v3"] }; else: { properties: { v3: { type: "number" } }; required: ["v3"] } }] }, { allOf: [{ if: { properties: { k4: { const: "a" } }; required: ["k4"] }; then: { properties: { v4: { type: "string" } }; required: ["v4"] }; else: { properties: { v4: { type: "number" } }; required: ["v4"] } }] }, { allOf: [{ if: { properties: { k5: { const: "a" } }; required: ["k5"] }; then: { properties: { v5: { type: "string" } }; required: ["v5"] }; else: { properties: { v5: { type: "number" } }; required: ["v5"] } }] }] }>
			attest<Direct, T>()
		})
	})

	describe("compositions beside nullable or not nested forty deep", () => {
		it("nullable allOf nested forty deep", () => {
			// limitation: applyModifiers around a two-branch allOf costs extra depth per level, so a circularity error (any) from 32 levels (31 before TS 7)
			// prettier-ignore
			// @ts-ignore
			type T = jsonSchema.infer<{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string"; nullable: true; allOf: [{ type: "string" }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }, { minLength: 1 }] }>
			attest({} as T).type.toString.snap("any")
		})

		it("nullable anyOf nested forty deep", () => {
			// limitation: the same with a two-branch anyOf gives a circularity error (any) from 32 levels (also oneOf; before TS 7, 34 and if/then/else 36)
			// prettier-ignore
			// @ts-ignore
			type T = jsonSchema.infer<{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string"; nullable: true; anyOf: [{ type: "string" }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }>
			attest({} as T).type.toString.snap("any")
		})

		it("not beside anyOf nested forty deep", () => {
			// limitation: an exact not beside a two-branch anyOf gives a circularity error (any) from 32 levels
			// prettier-ignore
			// @ts-ignore
			type T = jsonSchema.infer<{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string"; not: { const: "y" }; anyOf: [{ type: "string" }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }, { const: "x" }] }>
			attest({} as T).type.toString.snap("any")
		})
	})

	describe("jsonSchema values in not", () => {
		it("a negated null schema", () => {
			const Null = jsonSchema({ type: "null" })
			// limitation: a jsonSchema value in not excludes nothing, since its brand key makes it inexact (a sound fix must require a key besides the brand's)
			attest(
				inferred({ type: ["string", "null"], not: Null })
			).type.toString.snap("string | null")
		})

		it("a negated true schema", () => {
			// limitation: `true & InferredJsonSchema` passes the object check and has a valueOf key, so it is read as an inexact negation
			attest(
				inferred({ type: "string", not: jsonSchema(true) })
			).type.toString.snap("string")
		})

		it("an asserted value in not excludes nothing", () => {
			// jsonSchema.as<t> has only the brand's keys, though its schema may
			// have any keywords: "" is accepted here, so it can't be read as `not: {}`
			const nonEmpty = jsonSchema.as<string>({ type: "string", minLength: 1 })
			attest<string>(inferred({ type: "string", not: nonEmpty }))
			const exclude = (s: jsonSchema<string>) =>
				inferred({ type: "string", not: s })
			attest<string>(exclude(nonEmpty))
		})
	})

	describe("generated and interface schemas", () => {
		it("zod-to-json-schema draft-07 output", () => {
			const T = inferred({
				$ref: "#/definitions/User",
				definitions: {
					User: {
						type: "object",
						properties: {
							name: { type: ["string", "null"] },
							kind: { type: "string", const: "user" },
							n: { type: "number", const: 1 },
							b: { type: "boolean", const: true },
							role: { type: "string", enum: ["a", "b"] },
							native: { type: ["string", "number"], enum: ["A", 1] },
							nullableEnum: { type: ["string", "null"], enum: ["a", null] },
							never: { not: {} },
							any: {},
							big: { type: "integer", format: "int64" }
						},
						required: [
							"name",
							"kind",
							"n",
							"b",
							"role",
							"native",
							"nullableEnum"
						],
						additionalProperties: false
					}
				},
				$schema: "http://json-schema.org/draft-07/schema#"
			})
			attest<{
				name: string | null
				kind: "user"
				n: 1
				b: true
				role: "a" | "b"
				native: 1 | "A"
				nullableEnum: "a" | null
				never?: never
				any?: unknown
				big?: number
			}>(T)
		})

		it("OpenAPI 3.0 nullable", () => {
			const T = inferred({
				type: "object",
				properties: {
					a: { type: "string", nullable: true },
					b: { allOf: [{ $ref: "#/components/schemas/B" }], nullable: true },
					c: { type: "string", enum: ["x", "y"], nullable: true }
				},
				required: ["a", "b", "c"],
				components: {
					schemas: {
						B: { type: "object", properties: { id: { type: "integer" } } }
					}
				}
			})
			attest<{
				a: string | null
				b: { id?: number } | null
				c: "x" | "y" | null
			}>(T)
		})

		it("interfaces extending JsonSchema.String", () => {
			interface A extends JsonSchema.String {
				const: "a"
			}
			interface B extends JsonSchema.String {
				nullable?: boolean
			}
			attest<"a" | null, jsonSchema.infer<A>>()
			attest<string | null, jsonSchema.infer<B>>()
			attest<
				string,
				jsonSchema.infer<{ type: "string"; not: JsonSchema.String }>
			>()
		})
	})

	describe("composed jsonSchema values", () => {
		it("nested values are inferred from their keywords", () => {
			const int = jsonSchema({ type: "integer", nullable: true })
			attest<null>(jsonSchema({ type: ["string", "null"], allOf: [int] }).infer)
			attest<string | number | null>(
				jsonSchema({ anyOf: [jsonSchema({ type: "string" }), int] }).infer
			)
		})
	})
})

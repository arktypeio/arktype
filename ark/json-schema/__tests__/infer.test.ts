import { attest, contextualize } from "@ark/attest"
import { jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import type { Json } from "@ark/util"
import type { JsonSchema } from "arktype"
import { inferred } from "./utils.ts"

contextualize(() => {
	describe("type", () => {
		it("integer", () => {
			const T = jsonSchemaToType({ type: "integer" })
			attest(T.infer).type.toString.snap("number")
		})

		it("keywords of other families are ignored", () => {
			const T = inferred({
				type: "string",
				properties: { a: { type: "number" } },
				required: ["a"],
				items: { type: "number" },
				minimum: 5
			})
			attest(T).type.toString.snap("string")
		})

		it("object and array branches with both keyword families", () => {
			const T = inferred({
				type: ["object", "array", "string"],
				properties: { a: { type: "number" } },
				items: { type: "boolean" },
				minLength: 1
			})
			attest(T).type.toString.snap("string | boolean[] | { a?: number }")
		})

		it("widened type name", () => {
			const name: string = "string"
			attest(inferred({ type: name })).type.toString.snap("unknown")
			attest(inferred({ type: [name, "null"] })).type.toString.snap("unknown")
		})

		it("any and never type names", () => {
			attest(inferred({ type: {} as any })).type.toString.snap("unknown")
			// no value has a never type name, so the string shortcut is sound
			attest(inferred({ type: {} as never })).type.toString.snap("string")
		})
	})

	describe("schemas without a type", () => {
		it("keywords that imply no type", () => {
			attest(inferred({})).type.toString.snap("unknown")
			attest<unknown, jsonSchema.infer<{ type?: "string" }>>()
			const T = inferred({
				minLength: 1,
				minItems: 1,
				additionalItems: { type: "string" },
				uniqueItems: true,
				contains: { type: "string" },
				minProperties: 1,
				propertyNames: { minLength: 1 },
				dependentSchemas: { a: { required: ["b"] } }
			})
			attest(T).type.toString.snap("unknown")
		})
	})

	describe("widened, any and never", () => {
		it("root", () => {
			attest<any, jsonSchema.infer<any>>()
			attest<[never], [jsonSchema.infer<never>]>()
			attest<unknown, jsonSchema.infer<unknown>>()
		})

		// a branch's index signature admits openapi-3.0's nullable
		it("JsonSchema branches", () => {
			attest<string | null, jsonSchema.infer<JsonSchema.String>>()
			attest<number | null, jsonSchema.infer<JsonSchema.Numeric>>()
			attest<object | null, jsonSchema.infer<JsonSchema.Object>>()
			attest<unknown[] | null, jsonSchema.infer<JsonSchema.Array>>()
			attest<Json, jsonSchema.infer<JsonSchema.Const>>()
			attest<Json, jsonSchema.infer<JsonSchema.Enum>>()
			attest<unknown, jsonSchema.infer<JsonSchema.Constrainable>>()
			attest<unknown, jsonSchema.infer<JsonSchema.Branch>>()
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
		})

		it("an any part is dropped from an intersection", () => {
			attest<string, jsonSchema.infer<{ type: "string"; allOf: [any] }>>()
			attest(
				{} as jsonSchema.infer<{ type: "string"; allOf: [any]; const: "a" }>
			).type.toString.snap('"a"')
		})

		it("any keyword values beside a type", () => {
			attest<string, jsonSchema.infer<{ type: "string"; const: any }>>()
			attest<string, jsonSchema.infer<{ type: "string"; not: any }>>()
			attest<
				string | null,
				jsonSchema.infer<{ type: "string"; nullable: any }>
			>()
		})
	})

	describe("hand-written keyword values", () => {
		it("keywords that may be absent contribute nothing", () => {
			attest<
				string,
				jsonSchema.infer<{ type: "string"; const?: "a"; enum?: ["b"] }>
			>()
			attest<
				string,
				jsonSchema.infer<{
					type: "string"
					oneOf: [{ const: "a" }] | undefined
					not: { type: "string" } | undefined
				}>
			>()
		})

		it("unknown keyword values contribute nothing", () => {
			attest<string, jsonSchema.infer<{ type: "string"; not: unknown }>>()
			attest<string, jsonSchema.infer<{ type: "string"; allOf: unknown }>>()
			attest<"a", jsonSchema.infer<{ type: unknown; const: "a" }>>()
			// nullable may be true
			attest<
				string | null,
				jsonSchema.infer<{ type: "string"; nullable: unknown }>
			>()
		})

		it("never keyword values are vacuous", () => {
			attest<string, jsonSchema.infer<{ type: "string"; enum: never }>>()
			attest<string, jsonSchema.infer<{ type: "string"; not: never }>>()
			attest<[never], [jsonSchema.infer<{ type: "string"; anyOf: [never] }>]>()
		})

		it("union keyword values distribute", () => {
			attest<
				"a" | "b",
				jsonSchema.infer<{
					type: "string"
					allOf: [{ const: "a" }] | [{ const: "b" }, { const: "b" }]
				}>
			>()
		})
	})

	describe("const and enum", () => {
		it("const and enum", () => {
			attest(
				jsonSchemaToType({ const: { a: 1, b: "x" } }).infer
			).type.toString.snap('{ readonly a: 1; readonly b: "x" }')
			const T = inferred({ enum: [{ a: 1 }, [1, 2], "x"] })
			attest(T).type.toString.snap('"x" | { readonly a: 1 } | readonly [1, 2]')
			attest(inferred({ enum: [] })).type.toString.snap("never")
		})

		it("a widened object may be an array", () => {
			attest({} as jsonSchema.infer<{ const: object }>).type.toString.snap(
				"object | unknown[]"
			)
			attest(
				{} as jsonSchema.infer<{ enum: (object | "a")[] }>
			).type.toString.snap('"a" | object | unknown[]')
			attest(
				{} as jsonSchema.infer<{ type: "array"; const: object }>
			).type.toString.snap("unknown[]")
			attest<[never], [jsonSchema.infer<{ type: "string"; const: object }>]>()
		})

		it("a type filters primitive values", () => {
			attest(
				jsonSchemaToType({ type: "string", enum: ["a", 1, "b", null] }).infer
			).type.toString.snap('"a" | "b"')
			attest(inferred({ type: "string", const: 1 })).type.toString.snap("never")
		})

		it("a type filters structured values", () => {
			const T = inferred({
				type: "object",
				enum: [{ a: 1 }, "x", null, 5, { b: true }]
			})
			attest(T).type.toString.snap("{ readonly a: 1 } | { readonly b: true }")
			attest(
				inferred({ type: "array", items: { type: "object" }, const: [[]] })
			).type.toString.snap("never")
		})

		it("a literal the base admits is kept", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "number" } },
				required: ["a"],
				const: { a: 1 }
			})
			attest(T).type.toString.snap("{ readonly a: 1 }")
		})

		it("a literal the base rejects is intersected with it", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				const: { a: 1 }
			})
			// an uninhabited object rather than never
			attest(T).type.toString.snap("{ a: never }")
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
	})

	describe("nullable", () => {
		it("hand-written", () => {
			attest<
				string | null,
				jsonSchema.infer<{ type: "string"; nullable: boolean }>
			>()
			attest<
				string,
				jsonSchema.infer<{ type: "string"; nullable: false | undefined }>
			>()
		})

		it("applies after values and before not", () => {
			attest<null>(inferred({ type: "string", nullable: true, const: null }))
			attest(
				inferred({ type: "string", nullable: true, not: { type: "null" } })
			).type.toString.snap("string")
		})

		it("an index signature may hold nullable", () => {
			attest(
				{} as jsonSchema.infer<{ type: "string"; [k: string]: unknown }>
			).type.toString.snap("string | null")
			attest(
				{} as jsonSchema.infer<{
					type: "object"
					properties: {
						a: { type: "string"; [k: string]: unknown } | { type: "number" }
					}
				}>
			).type.toString.snap("{ a?: string | number | null }")
			attest(
				{} as jsonSchema.infer<{
					$ref: "#/$defs/a"
					$defs: { a: { type: "string" } }
					[k: string]: unknown
				}>
			).type.toString.snap("string | null")
		})

		it("beside a $ref in a dialect that may be 2020-12", () => {
			attest(
				{} as jsonSchema.infer<{
					$schema: string
					$ref: "#/$defs/a"
					$defs: { a: { type: "string" } }
					nullable: true
				}>
			).type.toString.snap("string | null")
		})
	})

	describe("if/then/else", () => {
		it("if selects a branch", () => {
			type conditional<condition> = jsonSchema.infer<{
				type: "string"
				if: condition
				then: { const: "a" }
				else: { const: "b" }
			}>
			attest<"a", conditional<true>>()
			attest<"b", conditional<false>>()
			attest<"a" | "b", conditional<boolean>>()
			// an empty if always matches, but takes both branches (imprecise but sound)
			attest<"a" | "b", conditional<{}>>()
			// an if that may be absent has no effect
			attest<string, conditional<{ const: "a" } | undefined>>()
		})

		it("a conditional without if, then or else has no effect", () => {
			attest(
				inferred({
					type: "string",
					then: { type: "number" },
					else: { type: "boolean" }
				})
			).type.toString.snap("string")
			attest(
				inferred({ type: "string", if: true, then: { const: "a" } })
			).type.toString.snap("string")
		})
	})

	describe("not", () => {
		it("boolean", () => {
			attest(inferred({ type: "string", not: false })).type.toString.snap(
				"string"
			)
			attest(inferred({ type: "string", not: true })).type.toString.snap(
				"never"
			)
		})

		it("a type list", () => {
			attest(
				inferred({
					type: ["string", "number", "null"],
					not: { type: ["string", "null"] }
				})
			).type.toString.snap("number")
		})

		it("const from enum", () => {
			attest(
				jsonSchemaToType({ enum: [1, 2, 3], not: { const: 2 } }).infer
			).type.toString.snap("1 | 3")
		})

		it("domains from an unknown base", () => {
			attest(inferred({ not: { type: "string" } })).type.toString.snap(
				"number | boolean | object | unknown[] | null"
			)
			attest(
				inferred({ not: { enum: [null, true, false] } })
			).type.toString.snap("string | number | object | unknown[]")
			// the remaining non-array objects have no clean display, so it stays unknown
			attest(
				inferred({ not: { type: ["array", "string"] } })
			).type.toString.snap("unknown")
		})

		it("object and array domains", () => {
			attest(
				inferred({ enum: [[1], "a", { b: 1 }], not: { type: "object" } })
			).type.toString.snap('"a" | readonly [1]')
			attest(
				inferred({ enum: [[1], "a"], not: { type: "array" } })
			).type.toString.snap('"a"')
			attest(
				inferred({
					type: ["object", "string"],
					additionalProperties: { type: "string" },
					not: { type: "object" }
				})
			).type.toString.snap("string")
		})

		it("integer rejects nothing", () => {
			// limitation: TS can't express integers, so `type: "integer"` rejects nothing in a negation (sound but imprecise)
			attest(
				inferred({ enum: [1, 2], not: { type: "integer" } })
			).type.toString.snap("1 | 2")
			const T = inferred({
				enum: ["a", "b", 1],
				not: { type: ["string", "integer"] }
			})
			attest(T).type.toString.snap("1")
		})

		it("an empty negation rejects everything", () => {
			attest(inferred({ type: "string", not: {} })).type.toString.snap("never")
			attest<string>(inferred({ type: "string", not: { enum: [] } }))
		})

		it("annotations keep a negation exact, other keywords don't", () => {
			const T = inferred({
				type: ["string", "null"],
				not: { type: "null", description: "no nulls" }
			})
			attest(T).type.toString.snap("string")
			attest(
				{} as jsonSchema.infer<{
					type: ["string", "null"]
					not: { type: "null"; "x-a": 1 }
				}>
			).type.toString.snap("string | null")
		})

		it("keywords of one negation reject their intersection", () => {
			attest<
				string | number,
				jsonSchema.infer<{
					type: ["string", "number"]
					not: { type: ["number"]; enum: ["a", 1] }
				}>
			>()
			attest<
				string,
				jsonSchema.infer<{ type: "string"; not: { type: "string"; const: 1 } }>
			>()
		})

		it("an optional keyword rejects its value either way", () => {
			const T = {} as jsonSchema.infer<{
				enum: ["a", "b"]
				not: { const?: "a" }
			}>
			attest(T).type.toString.snap('"b"')
		})

		it("widened and union values reject only what every member rejects", () => {
			attest<string, jsonSchema.infer<{ type: "string"; not: JsonSchema }>>()
			attest<
				string,
				jsonSchema.infer<{ type: "string"; not: { const: `a${string}b` } }>
			>()
			attest<
				false,
				jsonSchema.infer<{ type: "boolean"; not: { const: true & {} } }>
			>()
			const T = {} as jsonSchema.infer<{
				enum: ["a", "b"]
				not: { enum: ["a"] | ["b"] }
			}>
			attest(T).type.toString.snap('"a" | "b"')
			const U = {} as jsonSchema.infer<{
				type: ["string", "boolean"]
				not: { type: ["boolean" | "string"] }
			}>
			attest(U).type.toString.snap("string | boolean")
		})

		it("JSON compares strings and numbers by value", () => {
			attest(
				inferred({ enum: ["__proto__", "a"], not: { const: "__proto__" } })
			).type.toString.snap('"a"')
			attest(
				inferred({ enum: ["toString", "a"], not: { const: "toString" } })
			).type.toString.snap('"a"')
			attest(inferred({ enum: [0, 1], not: { const: -0 } })).type.toString.snap(
				"1"
			)
		})

		it("objects are never exact", () => {
			const T = inferred({
				type: "object",
				properties: { a: { const: 1 } },
				required: ["a"],
				not: { const: { a: 1 } }
			})
			attest(T).type.toString.snap("{ a: 1 }")
			const U = inferred({
				enum: [{ a: 1 }, { a: 2 }, "x"],
				not: { enum: [{ a: 1 }, "x"] }
			})
			attest(U).type.toString.snap("{ readonly a: 1 } | { readonly a: 2 }")
		})

		it("tuples of exact values", () => {
			attest(
				inferred({ enum: [[1, 2], [1]], not: { const: [1] } })
			).type.toString.snap("readonly [1, 2]")
			const T = inferred({ type: "array", items: false, not: { const: [] } })
			attest(T).type.toString.snap("never")
			const U = inferred({
				type: "array",
				prefixItems: [{ type: "string" }],
				minItems: 1,
				items: false,
				not: { const: [{}] }
			})
			attest(U).type.toString.snap("[string]")
		})

		it("tuples that aren't a single value", () => {
			const T = {} as jsonSchema.infer<{
				enum: [[], [1]]
				not: { const: [1?] }
			}>
			attest(T).type.toString.snap("[] | [1]")
			const U = {} as jsonSchema.infer<{
				enum: [["a"], ["b"]]
				not: { const: ["a" | "b"] }
			}>
			attest(U).type.toString.snap('["a"] | ["b"]')
		})
	})

	describe("jsonSchema values", () => {
		it("a spread reads the value's keywords", () => {
			const str = jsonSchema({ type: "string" })
			attest(jsonSchema({ ...str, type: "number" }).infer).type.toString.snap(
				"number"
			)
			const asserted = jsonSchema.as<string>({ type: "string" })
			attest(
				jsonSchema({ ...asserted, type: "number" }).infer
			).type.toString.snap("number")
			const { type: _, ...rest } = jsonSchema({ type: "string", minLength: 1 })
			attest(jsonSchema(rest).infer).type.toString.snap("unknown")
		})

		it("an asserted value as a subschema", () => {
			const a = jsonSchema.as<{ a: 1 }>({ type: "object" })
			const S = jsonSchema({ anyOf: [a, jsonSchema({ type: "string" })] })
			attest(S.infer).type.toString.snap("string | { a: 1 }")
		})

		it("a value with its own infer keyword", () => {
			const s = jsonSchema({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				infer: 5
			})
			attest<{ a: string }>({} as jsonSchema.infer<typeof s>)
			// the keyword is left out of the branded type, so it doesn't intersect into the getter
			attest(s.infer).type.toString.snap("{ a: string }")
		})

		it("a value with an $id keeps its refs", () => {
			const leafy = jsonSchema({
				$id: "https://example.com/leafy",
				$defs: { leaf: { type: "string" } },
				type: "object",
				properties: { l: { $ref: "#/$defs/leaf" } }
			})
			const doc = jsonSchema({ type: "array", items: leafy })
			attest<{ l?: string }[]>(doc.infer)
		})
	})

	describe("real-world", () => {
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
	})
})

import { attest, contextualize } from "@ark/attest"
import { type jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import type { array } from "@ark/util"

// checks inference for schemas the runtime parser doesn't support yet ($ref, {}, type-less)
// like jsonSchemaToType, the result is read back with `infer` so attest's
// contextual type isn't inferred into jsonSchema.infer
const inferred = <const schema, r = jsonSchema.infer<schema>>(
	schema: jsonSchema.validate<schema>
): r extends infer _ ? _ : never => schema as never

// declaration emit must be able to name the internal aliases of recursive types
export const tree = inferred({
	type: "object",
	properties: {
		value: { type: "number" },
		children: { type: "array", items: { $ref: "#" } }
	}
})

contextualize(() => {
	describe("objects", () => {
		it("properties and required", () => {
			const User = jsonSchemaToType({
				type: "object",
				properties: {
					name: { type: "string" },
					age: { type: "integer", minimum: 0 }
				},
				required: ["name"]
			})
			attest<{ name: string; age?: number }>(User.infer)
			attest(User.infer).type.toString.snap("{ name: string; age?: number }")
		})

		it("preserves property order", () => {
			const T = jsonSchemaToType({
				type: "object",
				properties: {
					a: { type: "string" },
					b: { type: "number" }
				},
				required: ["b"]
			})
			attest(T.infer).type.toString.snap("{ a?: string; b: number }")
		})

		it("all optional without required", () => {
			const T = jsonSchemaToType({
				type: "object",
				properties: {
					a: { type: "string" },
					b: { type: "number" }
				}
			})
			attest<{ a?: string; b?: number }>(T.infer)
		})

		it("additionalProperties schema", () => {
			attest<{ [k: string]: number }>(
				inferred({ type: "object", additionalProperties: { type: "number" } })
			)
		})

		it("properties with additionalProperties schema", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				additionalProperties: { type: ["string", "number"] }
			})
			attest<{ [k: string]: string | number; a: string }>(T)
		})

		it("additionalProperties boolean", () => {
			attest<{ a?: string }>(
				jsonSchemaToType({
					type: "object",
					properties: { a: { type: "string" } },
					additionalProperties: false
				}).infer
			)
			attest<{ a?: string }>(
				jsonSchemaToType({
					type: "object",
					properties: { a: { type: "string" } },
					additionalProperties: true
				}).infer
			)
		})

		it("patternProperties", () => {
			const T = jsonSchemaToType({
				type: "object",
				patternProperties: {
					"^x-": { type: "string" },
					"^n-": { type: "number" }
				},
				additionalProperties: false
			})
			attest<{ [k: string]: string | number }>(T.infer)
		})

		it("implied by object keywords", () => {
			attest<string | number | boolean | unknown[] | { a?: string } | null>(
				inferred({ properties: { a: { type: "string" } } })
			).type.toString.snap(
				`	| string
	| number
	| boolean
	| unknown[]
	| { a?: string }
	| null`
			)
		})

		it("required without properties", () => {
			attest<{ a: unknown }>(inferred({ type: "object", required: ["a"] }))
		})

		it("properties and required split across allOf", () => {
			attest<{ a: string }>(
				inferred({
					allOf: [
						{ type: "object", properties: { a: { type: "string" } } },
						{ required: ["a"] }
					]
				})
			)
		})
	})

	describe("arrays", () => {
		it("items", () => {
			const T = jsonSchemaToType({ type: "array", items: { type: "string" } })
			attest<string[]>(T.infer)
			attest(T.infer).type.toString.snap("string[]")
		})

		it("prefixItems are optional without minItems", () => {
			attest<[string?, number?, ...unknown[]]>(
				jsonSchemaToType({
					type: "array",
					prefixItems: [{ type: "string" }, { type: "number" }]
				}).infer
			)
		})

		it("minItems makes prefixItems required", () => {
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }, { type: "number" }],
				minItems: 1,
				items: false
			})
			attest<[string, number?]>(T.infer)
			attest(T.infer).type.toString.snap("[string, number?]")
		})

		it("prefixItems with items", () => {
			attest<[string, number, ...boolean[]]>(
				jsonSchemaToType({
					type: "array",
					prefixItems: [{ type: "string" }, { type: "number" }],
					minItems: 2,
					items: { type: "boolean" }
				}).infer
			)
		})

		it("draft-07 items array", () => {
			attest<[string, number]>(
				jsonSchemaToType({
					type: "array",
					items: [{ type: "string" }, { type: "number" }],
					minItems: 2,
					additionalItems: false
				}).infer
			)
			attest<[string, number?, ...boolean[]]>(
				inferred({
					type: "array",
					items: [{ type: "string" }, { type: "number" }],
					minItems: 1,
					additionalItems: { type: "boolean" }
				})
			)
			attest<[string?, number?, ...unknown[]]>(
				inferred({
					type: "array",
					items: [{ type: "string" }, { type: "number" }]
				})
			)
		})

		it("items false", () => {
			attest<[]>(inferred({ type: "array", items: false }))
		})

		it("minItems without prefixItems", () => {
			attest<string[]>(
				jsonSchemaToType({
					type: "array",
					items: { type: "string" },
					minItems: 2
				}).infer
			)
		})

		it("implied by array keywords", () => {
			attest<string | number | boolean | object | string[] | null>(
				inferred({ items: { type: "string" } })
			).type.toString.snap(
				`	| string
	| number
	| boolean
	| object
	| string[]
	| null`
			)
		})

		it("long prefixItems", () => {
			type Long = jsonSchema.infer<{
				type: "array"
				prefixItems: array.repeat<{ type: "string" }, 120>
				minItems: 120
				items: false
			}>
			attest<array.repeat<string, 120>, Long>()
		})
	})

	describe("composition", () => {
		it("anyOf", () => {
			const T = jsonSchemaToType({
				anyOf: [{ type: "string" }, { type: "number" }]
			})
			attest<string | number>(T.infer)
		})

		it("oneOf", () => {
			attest<{ a: string } | { b: number }>(
				inferred({
					oneOf: [
						{
							type: "object",
							properties: { a: { type: "string" } },
							required: ["a"]
						},
						{
							type: "object",
							properties: { b: { type: "number" } },
							required: ["b"]
						}
					]
				})
			)
		})

		it("base with anyOf", () => {
			attest<{ kind: string; a: number } | { kind: string; b: boolean }>(
				inferred({
					type: "object",
					properties: { kind: { type: "string" } },
					required: ["kind"],
					anyOf: [
						{ properties: { a: { type: "number" } }, required: ["a"] },
						{ properties: { b: { type: "boolean" } }, required: ["b"] }
					]
				})
			)
		})

		it("allOf", () => {
			const T = jsonSchemaToType({
				allOf: [
					{
						type: "object",
						properties: { a: { type: "string" } },
						required: ["a"]
					},
					{
						type: "object",
						properties: { b: { type: "number" } },
						required: ["b"]
					}
				]
			})
			attest<{ a: string; b: number }>(T.infer)
			attest(T.infer).type.toString.snap("{ a: string; b: number }")
		})

		it("not with a constrained schema", () => {
			attest<string>(inferred({ type: "string", not: { minLength: 3 } }))
		})
	})

	describe("refs", () => {
		it("$defs", () => {
			attest<{ first: string }>(
				inferred({
					$defs: { name: { type: "string" } },
					type: "object",
					properties: { first: { $ref: "#/$defs/name" } },
					required: ["first"]
				})
			)
		})

		it("definitions", () => {
			attest<{ first?: string }>(
				inferred({
					definitions: { name: { type: "string" } },
					type: "object",
					properties: { first: { $ref: "#/definitions/name" } }
				})
			)
		})

		it("root ref", () => {
			type Tree = { value: number; children?: Tree[] }
			const T = inferred({
				type: "object",
				properties: {
					value: { type: "number" },
					children: { type: "array", items: { $ref: "#" } }
				},
				required: ["value"]
			})
			attest<Tree>(T)
			attest<number | undefined>(T.children?.[0].children?.[0].value)
		})

		it("mutually recursive $defs", () => {
			type A = { b?: B }
			type B = { a?: A[] }
			attest<A>(
				inferred({
					$ref: "#/$defs/a",
					$defs: {
						a: { type: "object", properties: { b: { $ref: "#/$defs/b" } } },
						b: {
							type: "object",
							properties: { a: { type: "array", items: { $ref: "#/$defs/a" } } }
						}
					}
				})
			)
		})

		it("arktype's cyclic json object", () => {
			type JsonObject = {
				[k: string]: JsonObject | number | string | boolean | null
			}
			// $ark.intrinsic.jsonObject.toJsonSchema()
			attest<JsonObject>(
				inferred({
					$ref: "#/$defs/intersection11",
					$defs: {
						intersection11: {
							type: "object",
							additionalProperties: { $ref: "#/$defs/jsonData1" }
						},
						jsonData1: {
							anyOf: [
								{ $ref: "#/$defs/intersection11" },
								{ type: "number" },
								{ type: "string" },
								{ type: "boolean" },
								{ type: "null" }
							]
						},
						union7: {
							anyOf: [{ $ref: "#/$defs/intersection11" }, { type: "boolean" }]
						}
					}
				})
			)
		})

		it("ref with siblings", () => {
			attest<{ x: string }>(
				inferred({
					$defs: {
						a: { type: "object", properties: { x: { type: "string" } } }
					},
					$ref: "#/$defs/a",
					required: ["x"]
				})
			)
		})

		it("json pointer", () => {
			attest<{ a?: number; b?: number }>(
				inferred({
					type: "object",
					properties: {
						a: { type: "number" },
						b: { $ref: "#/properties/a" }
					}
				})
			)
			attest<string>(
				inferred({ $defs: { "a/b": { type: "string" } }, $ref: "#/$defs/a~1b" })
			)
		})

		it("shallow cycles", () => {
			attest<unknown>(inferred({ $ref: "#" }))
			attest<unknown>(
				inferred({
					$ref: "#/$defs/a",
					$defs: {
						a: { $ref: "#/$defs/b" },
						b: { $ref: "#/$defs/a" }
					}
				})
			)
		})

		it("remote ref", () => {
			attest<unknown>(inferred({ $ref: "https://example.com/schema.json" }))
		})

		it("unresolvable ref", () => {
			attest(() =>
				inferred({
					$defs: { node: { type: "string" } },
					// @ts-expect-error
					$ref: "#/$defs/nod"
				})
			).type.errors(`'"#/$defs/nod"' is not assignable`)
		})

		it("completes refs", () => {
			attest(() =>
				inferred({
					$defs: { node: { type: "string" } },
					// @ts-expect-error
					$ref: "#/$defs/n"
				})
			).completions({ "#/$defs/n": ["#/$defs/node"] })
		})
	})

	describe("validation", () => {
		it("bad type name", () => {
			// @ts-expect-error
			attest(() => jsonSchemaToType({ type: "strin" })).type.errors(
				`Did you mean '"string"'?`
			)
		})

		it("bad type name in list", () => {
			// @ts-expect-error
			attest(() => jsonSchemaToType({ type: ["string", "nul"] })).type.errors(
				`Did you mean '"null"'?`
			)
		})

		it("completes type names", () => {
			// @ts-expect-error
			attest(() => jsonSchemaToType({ type: "st" })).completions({
				st: ["string"]
			})
		})

		it("nested error placement", () => {
			attest(() =>
				jsonSchemaToType({
					type: "object",
					properties: {
						a: {
							type: "object",
							properties: {
								// @ts-expect-error
								b: { type: "numbr" }
							}
						}
					}
				})
			).type.errors(`Did you mean '"number"'?`)
		})

		it("required key not in properties", () => {
			attest(() =>
				jsonSchemaToType({
					type: "object",
					properties: { name: { type: "string" }, age: { type: "number" } },
					// @ts-expect-error
					required: ["name", "nme"]
				})
			).type.errors(`Did you mean '"name"'?`)
		})

		it("completes required keys", () => {
			attest(() =>
				jsonSchemaToType({
					type: "object",
					properties: { name: { type: "string" } },
					// @ts-expect-error
					required: ["na"]
				})
			).completions({ na: ["name"] })
		})

		it("wrong keyword value kind", () => {
			attest(() =>
				// @ts-expect-error
				jsonSchemaToType({ type: "string", minLength: "3" })
			).type.errors(`Type 'string' is not assignable to type 'number'`)
		})

		it("non-schema subschema", () => {
			attest(() =>
				jsonSchemaToType({
					type: "object",
					// @ts-expect-error
					properties: { a: "string" }
				})
			).type.errors("JSON Schema must be an object or a boolean (was string)")
		})

		it("const and enum", () => {
			const T = jsonSchemaToType({ const: "a", enum: ["a", "b"] })
			attest(T.infer).type.toString.snap('"a"')
			attest(T.expression).snap('"a"')
		})

		it("maximum and exclusiveMaximum", () => {
			const T = jsonSchemaToType({
				type: "number",
				maximum: 5,
				exclusiveMaximum: 5
			})
			attest(T.infer).type.toString.snap("number")
			attest(T.expression).snap("number < 5")
		})

		it("prefixItems, items and additionalItems", () => {
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }],
				items: { type: "number" },
				additionalItems: { type: "boolean" }
			})
			attest(T.infer).type.toString.snap("[string?, ...number[]]")
			attest(T.expression).snap("[string?, ...number[]]")
		})

		it("unknown keywords are allowed", () => {
			const T = jsonSchemaToType({
				type: "string",
				"x-foo": 1,
				foo: { bar: true }
			})
			attest<string>(T.infer)
		})

		it("completes keywords", () => {
			attest(() =>
				// prettier-ignore
				jsonSchemaToType({ type: "string", "minLe": 1 })
			).completions({ minLe: ["minLength"] })
		})
	})
})

import { attest, contextualize, getChecker } from "@ark/attest"
import { jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import type { JsonSchema } from "arktype"

// checks inference without reading the schema at runtime
// like jsonSchemaToType, the result is read back with `infer` so attest's
// contextual type isn't inferred into jsonSchema.infer
const inferred = <const schema, r = jsonSchema.infer<schema>>(
	schema: jsonSchema.validate<schema>
): r extends infer _ ? _ : never => schema as never

contextualize(() => {
	describe("allOf primitives", () => {
		it("constraint-only branch", () => {
			const T = inferred({ allOf: [{ type: "string" }, { minLength: 1 }] })
			attest<string>(T).type.toString.snap("string")
		})

		it("disjoint primitives", () => {
			const T = inferred({ allOf: [{ type: "string" }, { type: "number" }] })
			attest<never>(T).type.toString.snap("never")
		})

		it("object and array", () => {
			// JSON Schema's "object" excludes arrays
			const T = inferred({ allOf: [{ type: "object" }, { type: "array" }] })
			attest<never>(T).type.toString.snap("never")
		})

		it("object and array with keywords", () => {
			const T = inferred({
				allOf: [
					{ type: "object", properties: { a: { type: "string" } } },
					{ type: "array", items: { type: "string" } }
				]
			})
			attest<never>(T).type.toString.snap("never")
		})

		it("type lists intersect", () => {
			const T = inferred({
				allOf: [{ type: ["string", "number"] }, { type: ["number", "null"] }]
			})
			attest<number>(T).type.toString.snap("number")
		})

		it("single branch", () => {
			const T = inferred({ allOf: [{ type: "boolean" }] })
			attest<boolean>(T).type.toString.snap("boolean")
		})

		it("empty", () => {
			// @ts-expect-error
			const T = inferred({ allOf: [] })
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("true branch", () => {
			const T = inferred({ allOf: [true, { type: "string" }] })
			attest<string>(T).type.toString.snap("string")
		})

		it("false branch", () => {
			const T = inferred({ allOf: [{ type: "string" }, false] })
			attest<never>(T).type.toString.snap("never")
		})

		it("empty schema branch", () => {
			const T = inferred({ allOf: [{}, { type: "number" }, {}] })
			attest<number>(T).type.toString.snap("number")
		})

		it("all branches unconstrained", () => {
			const T = inferred({ allOf: [{ minLength: 1 }, { maximum: 5 }] })
			attest<unknown>(T).type.toString.snap("unknown")
		})
	})

	describe("allOf base keywords", () => {
		it("base type list narrowed by branch", () => {
			const T = inferred({
				type: ["string", "null"],
				allOf: [{ type: "string" }]
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("base type disjoint from branch", () => {
			const T = inferred({ type: "string", allOf: [{ type: "number" }] })
			attest<never>(T).type.toString.snap("never")
		})

		it("base object with branch properties", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				allOf: [{ properties: { b: { type: "number" } } }]
			})
			attest<{ a: string; b?: number }>(T).type.toString.snap(
				"{ a: string; b?: number }"
			)
		})

		it("base required without properties", () => {
			const T = inferred({
				type: "object",
				required: ["a"],
				allOf: [{ properties: { a: { type: "string" } } }]
			})
			attest<{ a: string }>(T).type.toString.snap("{ a: string }")
		})

		it("base properties made required by branch", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" }, b: { type: "number" } },
				allOf: [{ required: ["b"] }]
			})
			attest<{ a?: string; b: number }>(T).type.toString.snap(
				"{ a?: string; b: number }"
			)
		})

		it("base enum narrowed by branch type", () => {
			const T = inferred({
				enum: ["a", 1, true, null],
				allOf: [{ type: ["string", "boolean"] }]
			})
			attest<"a" | true>(T).type.toString.snap('"a" | true')
		})

		it("base const disjoint from branch", () => {
			const T = inferred({ const: "5", allOf: [{ type: "number" }] })
			attest<never>(T).type.toString.snap("never")
		})

		it("branch additionalProperties constrains base properties", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				allOf: [{ additionalProperties: { type: "number" } }]
			})
			attest<{ [x: string]: number; a?: never }>(T).type.toString.snap(
				"{ [x: string]: number; a?: never }"
			)
		})
	})

	describe("allOf objects", () => {
		it("runtime-supported disjoint required properties", () => {
			const T = jsonSchemaToType({
				allOf: [
					{
						type: "object",
						properties: { a: { type: "string" } },
						required: ["a"]
					},
					{ type: "object", properties: { b: { type: "number" } } }
				]
			})
			attest<{ a: string; b?: number }>(T.infer).type.toString.snap(
				"{ a: string; b?: number }"
			)
		})

		it("key order follows branch order", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{ properties: { z: { type: "string" } } },
					{ properties: { a: { type: "number" } } },
					{ properties: { m: { type: "boolean" } } }
				]
			})
			attest<{ z?: string; a?: number; m?: boolean }>(T).type.toString.snap(
				"{ z?: string; a?: number; m?: boolean }"
			)
		})

		it("same property in both branches", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{ properties: { a: { type: "string" } }, required: ["a"] },
					{ properties: { a: { type: "string" } } }
				]
			})
			attest<{ a: string }>(T).type.toString.snap("{ a: string }")
		})

		it("overlapping property narrowed to literal", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{ properties: { kind: { type: "string" } }, required: ["kind"] },
					{ properties: { kind: { const: "user" } } }
				]
			})
			attest<{ kind: "user" }>(T).type.toString.snap('{ kind: "user" }')
		})

		it("conflicting optional property", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{ properties: { a: { type: "string" } } },
					{ properties: { a: { type: "number" } } }
				]
			})
			attest<{ a?: never }>(T).type.toString.snap("{ a?: never }")
		})

		it("required before properties", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{ required: ["a"] },
					{ properties: { a: { type: "string" }, b: { type: "null" } } }
				]
			})
			attest<{ a: string; b?: null }>(T).type.toString.snap(
				"{ a: string; b?: null }"
			)
		})

		it("required key absent from every branch's properties", () => {
			const T = inferred({
				type: "object",
				allOf: [{ properties: { a: { type: "string" } } }, { required: ["b"] }]
			})
			attest<{ a?: string; b: unknown }>(T).type.toString.snap(
				"{ a?: string; b: unknown }"
			)
		})

		it("false property made required", () => {
			const T = inferred({
				type: "object",
				allOf: [{ properties: { a: false } }, { required: ["a"] }]
			})
			attest<{ a: never }>(T).type.toString.snap("{ a: never }")
		})

		it("bare object branch", () => {
			const T = inferred({
				allOf: [
					{ type: "object" },
					{ properties: { a: { type: "string" } }, required: ["a"] }
				]
			})
			attest<{ a: string }>(T).type.toString.snap("{ a: string }")
		})

		it("index signature conflicting with property", () => {
			// the first branch's additionalProperties applies to `a`, so it
			// must be both a string and a number
			const T = inferred({
				type: "object",
				allOf: [
					{ additionalProperties: { type: "string" } },
					{ properties: { a: { type: "number" } }, required: ["a"] }
				]
			})
			attest<{ [x: string]: string; a: never }>(T).type.toString.snap(
				"{ [x: string]: string; a: never }"
			)
		})

		it("two index signatures", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{ additionalProperties: { type: ["string", "number"] } },
					{
						patternProperties: { "^x": { type: ["number", "null"] } },
						additionalProperties: false
					}
				]
			})
			attest<{ [k: string]: number }>(T).type.toString.snap(
				"{ [x: string]: number }"
			)
		})

		it("additionalProperties false branch", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{
						properties: { a: { type: "string" } },
						additionalProperties: false
					},
					{ properties: { a: { minLength: 1 } }, required: ["a"] }
				]
			})
			attest<{ a: string }>(T).type.toString.snap("{ a: string }")
		})

		it("nested object properties intersect", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{
						properties: {
							a: {
								type: "object",
								properties: { x: { type: "string" } },
								required: ["x"]
							}
						},
						required: ["a"]
					},
					{
						properties: { a: { properties: { y: { type: "number" } } } }
					}
				]
			})
			attest<{ a: { x: string; y?: number } }>(T).type.toString.snap(
				"{ a: { x: string; y?: number } }"
			)
		})
	})

	describe("arrays in composition", () => {
		it("items narrowed", () => {
			const T = inferred({
				allOf: [
					{ type: "array", items: { type: ["string", "number"] } },
					{ type: "array", items: { type: "string" } }
				]
			})
			attest<string[]>(T).type.toString.snap("string[]")
		})

		it("tuple and items", () => {
			const T = inferred({
				allOf: [
					{
						type: "array",
						prefixItems: [{ type: "string" }],
						minItems: 1,
						items: false
					},
					{ type: "array", items: { type: ["string", "number"] } }
				]
			})
			attest<[string]>(T).type.toString.snap("[string]")
		})

		it("tuples intersect element-wise", () => {
			const T = inferred({
				allOf: [
					{
						type: "array",
						prefixItems: [{ type: ["string", "number"] }, { type: "number" }],
						minItems: 1
					},
					{ type: "array", prefixItems: [{ type: "string" }], items: false }
				]
			})
			attest<[string]>(T).type.toString.snap("[string]")
		})

		it("tuple rests intersect", () => {
			const T = inferred({
				allOf: [
					{
						type: "array",
						prefixItems: [{ type: "string" }],
						minItems: 1,
						items: { type: ["string", "number"] }
					},
					{
						type: "array",
						prefixItems: [{ type: "string" }, { type: "number" }],
						items: { type: "number" }
					}
				]
			})
			attest<[string, number?, ...number[]]>(T).type.toString.snap(
				"[string, number?, ...number[]]"
			)
		})

		it("closed tuple missing a required element", () => {
			const T = inferred({
				allOf: [
					{
						type: "array",
						prefixItems: [{ type: "string" }, { type: "number" }],
						minItems: 2
					},
					{ type: "array", prefixItems: [{ type: "string" }], items: false }
				]
			})
			attest<never>(T).type.toString.snap("never")
		})

		it("an empty-items anyOf branch against a required prefix", () => {
			// `items: false` in a branch applies from index 0, so it forbids every element
			const T = inferred({
				type: "array",
				prefixItems: [{ type: "string" }],
				minItems: 1,
				anyOf: [{ items: false }, { items: { type: "number" } }]
			})
			attest<never>(T).type.toString.snap("never")
		})
	})

	describe("nested allOf", () => {
		it("allOf in allOf", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{
						allOf: [
							{ properties: { a: { type: "string" } } },
							{ properties: { b: { type: "number" } } }
						]
					},
					{ properties: { c: { type: "boolean" } } }
				]
			})
			attest<{ a?: string; b?: number; c?: boolean }>(T).type.toString.snap(
				"{ a?: string; b?: number; c?: boolean }"
			)
		})

		it("allOf in property", () => {
			const T = inferred({
				type: "object",
				properties: {
					a: { allOf: [{ type: "string" }, { minLength: 1 }] },
					b: {
						type: "object",
						allOf: [
							{ properties: { x: { type: "number" } } },
							{ required: ["x"] }
						]
					}
				},
				required: ["a", "b"]
			})
			attest<{ a: string; b: { x: number } }>(T).type.toString.snap(
				"{ a: string; b: { x: number } }"
			)
		})
	})

	describe("anyOf primitives", () => {
		it("two types", () => {
			const T = jsonSchemaToType({
				anyOf: [{ type: "string" }, { type: "number" }]
			})
			attest<string | number>(T.infer).type.toString.snap("string | number")
		})

		it("empty", () => {
			// spec-invalid; no branch can match
			// @ts-expect-error
			const T = inferred({ anyOf: [] })
			attest<never>(T).type.toString.snap("never")
		})

		it("true branch", () => {
			const T = inferred({ anyOf: [true, { type: "string" }] })
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("false branch", () => {
			const T = inferred({ anyOf: [false, { type: "string" }] })
			attest<string>(T).type.toString.snap("string")
		})

		it("constraint-only branch", () => {
			const T = inferred({ anyOf: [{ minLength: 1 }, { type: "string" }] })
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("annotations in branches", () => {
			const T = inferred({
				title: "Thing",
				description: "a thing",
				$comment: "x",
				anyOf: [
					{ type: "string", title: "s", examples: ["a"] },
					{ type: "number", deprecated: true, default: 1 }
				],
				"x-tag": "t"
			})
			attest<string | number>(T).type.toString.snap("string | number")
		})
	})

	describe("anyOf objects", () => {
		it("discriminated union", () => {
			const T = inferred({
				anyOf: [
					{
						type: "object",
						properties: { kind: { const: "a" }, a: { type: "string" } },
						required: ["kind", "a"]
					},
					{
						type: "object",
						properties: { kind: { const: "b" }, b: { type: "number" } },
						required: ["kind", "b"]
					}
				]
			})
			attest<{ kind: "a"; a: string } | { kind: "b"; b: number }>(
				T
			).type.toString.snap(
				'{ kind: "a"; a: string } | { kind: "b"; b: number }'
			)
			const narrow = (t: typeof T) => (t.kind === "a" ? t.a : t.b)
			attest<(t: typeof T) => string | number>(narrow)
		})

		it("base distributed into branches", () => {
			const T = inferred({
				type: "object",
				properties: { id: { type: "string" } },
				required: ["id"],
				anyOf: [
					{ properties: { a: { type: "number" } }, required: ["a"] },
					{ properties: { b: { type: "boolean" } } }
				]
			})
			attest<{ id: string; a: number } | { id: string; b?: boolean }>(T).type
				.toString.snap(`	| { id: string; b?: boolean }
	| { id: string; a: number }`)
		})

		it("required-only branches", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" }, b: { type: "number" } },
				anyOf: [{ required: ["a"] }, { required: ["b"] }]
			})
			attest<{ a: string; b?: number } | { a?: string; b: number }>(T).type
				.toString.snap(`	| { a: string; b?: number }
	| { a?: string; b: number }`)
		})

		it("base properties narrowed by branches", () => {
			const T = inferred({
				type: "object",
				properties: { kind: { type: "string" }, value: true },
				required: ["kind", "value"],
				anyOf: [
					{
						properties: { kind: { const: "n" }, value: { type: "number" } }
					},
					{
						properties: { kind: { const: "s" }, value: { type: "string" } }
					}
				]
			})
			attest<{ kind: "n"; value: number } | { kind: "s"; value: string }>(T)
				.type.toString.snap(`	| { kind: "n"; value: number }
	| { kind: "s"; value: string }`)
		})

		it("base object with primitive branch", () => {
			// the string branch can't satisfy `type: "object"`
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				anyOf: [{ type: "string" }, { required: ["a"] }]
			})
			attest<{ a: string }>(T).type.toString.snap("{ a: string }")
		})

		it("an index signature distributed into anyOf branches", () => {
			const T = inferred({
				type: "object",
				additionalProperties: { type: "string" },
				anyOf: [
					{ properties: { a: { const: "x" } }, required: ["a"] },
					{ properties: { b: { const: "y" } }, required: ["b"] }
				]
			})
			attest<{ [k: string]: string; a: "x" } | { [k: string]: string; b: "y" }>(
				T
			).type.toString.snap(
				`	| { [x: string]: string; a: "x" }
	| { [x: string]: string; b: "y" }`
			)
		})
	})

	describe("anyOf in properties and items", () => {
		it("property", () => {
			const T = inferred({
				type: "object",
				properties: {
					a: { anyOf: [{ type: "string" }, { type: "null" }] },
					b: { anyOf: [{ type: "number" }, { type: "boolean" }] }
				},
				required: ["a"]
			})
			attest<{ a: string | null; b?: number | boolean }>(T).type.toString.snap(
				"{ a: string | null; b?: number | boolean }"
			)
		})

		it("items", () => {
			const T = inferred({
				type: "array",
				items: { anyOf: [{ type: "string" }, { type: "number" }] }
			})
			attest<(string | number)[]>(T).type.toString.snap("(string | number)[]")
		})

		it("nested anyOf", () => {
			const T = inferred({
				anyOf: [
					{ anyOf: [{ type: "string" }, { type: "number" }] },
					{ anyOf: [{ type: "boolean" }, { anyOf: [{ type: "null" }] }] }
				]
			})
			attest<string | number | boolean | null>(T).type.toString.snap(
				"string | number | boolean | null"
			)
		})

		it("anyOf of allOf", () => {
			const T = inferred({
				anyOf: [
					{
						type: "object",
						allOf: [
							{ properties: { a: { type: "string" } }, required: ["a"] },
							{ properties: { b: { type: "string" } }, required: ["b"] }
						]
					},
					{ type: "null" }
				]
			})
			attest<{ a: string; b: string } | null>(T).type.toString.snap(
				"{ a: string; b: string } | null"
			)
		})

		it("allOf of anyOf", () => {
			const T = inferred({
				allOf: [
					{ anyOf: [{ type: "string" }, { type: "number" }] },
					{ anyOf: [{ type: "number" }, { type: "boolean" }] }
				]
			})
			attest<number>(T).type.toString.snap("number")
		})

		it("allOf of anyOf objects distributes", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{
						anyOf: [
							{ properties: { a: { type: "string" } }, required: ["a"] },
							{ properties: { b: { type: "string" } }, required: ["b"] }
						]
					},
					{ properties: { c: { type: "number" } }, required: ["c"] }
				]
			})
			attest<{ a: string; c: number } | { b: string; c: number }>(
				T
			).type.toString.snap(
				"{ a: string; c: number } | { b: string; c: number }"
			)
		})
	})

	describe("oneOf", () => {
		it("primitives", () => {
			const T = jsonSchemaToType({
				oneOf: [{ type: "string" }, { type: "boolean" }]
			})
			attest<string | boolean>(T.infer).type.toString.snap("string | boolean")
		})

		it("overlapping branches", () => {
			// exclusivity isn't expressible, so oneOf infers like anyOf
			const T = inferred({ oneOf: [{ type: "number" }, { type: "integer" }] })
			attest<number>(T).type.toString.snap("number")
		})

		it("base enum discriminant narrowed by oneOf branches", () => {
			const T = inferred({
				type: "object",
				properties: { kind: { enum: ["a", "b"] } },
				required: ["kind"],
				oneOf: [
					{
						properties: { kind: { const: "a" }, x: { type: "string" } },
						required: ["x"]
					},
					{
						properties: { kind: { const: "b" }, y: { type: "number" } },
						required: ["y"]
					}
				]
			})
			attest<{ kind: "a"; x: string } | { kind: "b"; y: number }>(
				T
			).type.toString.snap(
				'{ kind: "a"; x: string } | { kind: "b"; y: number }'
			)
		})

		it("mutually exclusive keys through false properties", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" }, b: { type: "number" } },
				oneOf: [
					{ required: ["a"], properties: { b: false } },
					{ required: ["b"], properties: { a: false } }
				]
			})
			attest<{ a: string; b?: never } | { a?: never; b: number }>(
				T
			).type.toString.snap(
				"{ a: string; b?: never } | { a?: never; b: number }"
			)
		})
	})

	describe("combined composition keywords", () => {
		it("allOf and anyOf", () => {
			const T = inferred({
				type: "object",
				allOf: [{ properties: { a: { type: "string" } }, required: ["a"] }],
				anyOf: [
					{ properties: { b: { type: "number" } }, required: ["b"] },
					{ properties: { c: { type: "boolean" } }, required: ["c"] }
				]
			})
			attest<{ a: string; b: number } | { a: string; c: boolean }>(T).type
				.toString.snap(`	| { a: string; b: number }
	| { a: string; c: boolean }`)
		})

		it("anyOf and oneOf objects", () => {
			const T = inferred({
				type: "object",
				anyOf: [
					{ properties: { a: { type: "string" } }, required: ["a"] },
					{ properties: { b: { type: "string" } }, required: ["b"] }
				],
				oneOf: [
					{ properties: { c: { type: "string" } }, required: ["c"] },
					{ properties: { d: { type: "string" } }, required: ["d"] }
				]
			})
			attest<
				| { a: string; c: string }
				| { a: string; d: string }
				| { b: string; c: string }
				| { b: string; d: string }
			>(T)
			attest(T).type.toString.snap(`	| { a: string; c: string }
	| { a: string; d: string }
	| { b: string; c: string }
	| { b: string; d: string }`)
		})

		it("all three with not and nullable", () => {
			const T = inferred({
				type: ["string", "number", "boolean"],
				allOf: [{ type: ["string", "number"] }],
				anyOf: [{ type: "string" }, { type: "number" }],
				oneOf: [{ type: "string" }, { type: "number" }],
				not: { type: "number" },
				nullable: true
			})
			attest<string | null>(T).type.toString.snap("string | null")
		})
	})

	describe("implied keywords with composition", () => {
		it("base type list with object-only branch keywords", () => {
			const T = inferred({
				type: ["string", "object"],
				allOf: [{ required: ["a"] }]
			})
			attest<string | { a: unknown }>(T).type.toString.snap(
				"string | { a: unknown }"
			)
		})

		it("properties and required without type", () => {
			// object keywords only constrain objects, so other JSON values are valid
			const T = inferred({
				allOf: [{ properties: { a: { type: "string" } } }, { required: ["a"] }]
			})
			attest<string | number | boolean | unknown[] | { a: string } | null>(T)
				.type.toString.snap(`	| string
	| number
	| boolean
	| unknown[]
	| { a: string }
	| null`)
		})

		it("implied-object base keywords don't constrain primitive branches", () => {
			// `properties` only applies to objects, so strings are valid here
			const T = inferred({
				properties: { a: { type: "number" } },
				anyOf: [{ type: "string" }, { type: "object" }]
			})
			attest<string | { a?: number }>(T).type.toString.snap(
				"string | { a?: number }"
			)
		})

		it("implied array items with a oneOf of types", () => {
			const T = inferred({
				items: { type: "string" },
				oneOf: [{ type: "array" }, { type: "null" }]
			})
			attest<string[] | null>(T).type.toString.snap("string[] | null")
		})

		it("implied object and implied array across allOf", () => {
			const T = inferred({
				properties: { a: { type: "number" } },
				allOf: [{ items: { type: "string" } }]
			})
			attest<string | number | boolean | { a?: number } | string[] | null>(T)
				.type.toString.snap(`	| string
	| number
	| boolean
	| string[]
	| { a?: number }
	| null`)
		})

		it("implied array keywords across allOf", () => {
			const T = inferred({
				allOf: [
					{ items: { type: "string" } },
					{ prefixItems: [{ type: "string" }, { type: "number" }] }
				]
			})
			attest<string | number | boolean | object | [string?] | null>(T).type
				.toString.snap(`	| string
	| number
	| boolean
	| object
	| [string?]
	| null`)
		})

		it("implied object minus every other domain", () => {
			const T = inferred({
				properties: { a: { type: "number" } },
				not: { type: ["string", "number", "boolean", "null", "array"] }
			})
			attest<{ a?: number }>(T).type.toString.snap("{ a?: number }")
		})

		it("implied object keywords with an object enum", () => {
			const T = inferred({
				properties: { a: { type: "string" } },
				enum: [{ a: 1 }, { a: "x" }, 5, [1]]
			})
			attest<5 | { readonly a: "x" } | { a: never } | readonly [1]>(T).type
				.toString.snap(`	| 5
	| { a: never }
	| { readonly a: "x" }
	| readonly [1]`)
		})
	})

	describe("const and enum with composition", () => {
		it("const disjoint from anyOf", () => {
			const T = inferred({
				const: true,
				anyOf: [{ type: "string" }, { type: "number" }]
			})
			attest<never>(T).type.toString.snap("never")
		})

		it("enum narrowed by anyOf", () => {
			const T = inferred({
				enum: ["a", 1, null, false],
				anyOf: [{ type: "string" }, { type: "null" }]
			})
			attest<"a" | null>(T).type.toString.snap('"a" | null')
		})

		it("enums intersected across allOf", () => {
			const T = inferred({
				allOf: [{ enum: ["a", "b", "c"] }, { enum: ["b", "c", "d"] }]
			})
			attest<"b" | "c">(T).type.toString.snap('"b" | "c"')
		})

		it("const object with allOf properties", () => {
			const T = inferred({
				const: { a: "x" },
				allOf: [{ properties: { a: { type: "string" } }, required: ["a"] }]
			})
			attest<{ readonly a: "x" }>(T).type.toString.snap('{ readonly a: "x" }')
		})

		it("object enum filtered by a required anyOf", () => {
			const T = inferred({
				enum: [{ a: 1 }, { b: "x" }],
				anyOf: [{ required: ["a"] }, { type: "string" }]
			})
			attest<{ readonly a: 1 } | { a: unknown; readonly b: "x" }>(
				T
			).type.toString.snap(
				'{ readonly b: "x"; a: unknown } | { readonly a: 1 }'
			)
		})

		it("a const filtered by a discriminated anyOf", () => {
			const T = inferred({
				anyOf: [
					{
						type: "object",
						properties: { k: { const: "a" }, v: { type: "string" } },
						required: ["k"]
					},
					{
						type: "object",
						properties: { k: { const: "b" }, v: { type: "number" } },
						required: ["k"]
					}
				],
				const: { k: "b", v: "x" }
			})
			attest<{ k: never; v: "x" } | { k: "b"; v: never }>(T).type.toString.snap(
				'{ k: never; v: "x" } | { k: "b"; v: never }'
			)
		})

		it("object const rejected by an allOf index signature", () => {
			const T = inferred({
				const: { a: 1, b: 2 },
				allOf: [{ additionalProperties: { type: "string" } }]
			})
			attest<{ [k: string]: string; readonly a: never; readonly b: never }>(T)
				.type.toString.snap(`{
	[x: string]: string
	readonly a: never
	readonly b: never
}`)
		})

		it("an object enum beside an allOf $ref", () => {
			const T = inferred({
				$defs: {
					a: { type: "object", properties: { x: { type: "number" } } }
				},
				allOf: [{ $ref: "#/$defs/a" }],
				enum: [{ x: 1 }, { x: "s" }]
			})
			// beside a ref (even an acyclic one), structured values are left unfiltered
			attest<{ readonly x: 1 } | { readonly x: "s" }>(T).type.toString.snap(
				'{ readonly x: 1 } | { readonly x: "s" }'
			)
		})

		it("tuple enums filtered by a oneOf of array shapes", () => {
			const T = inferred({
				oneOf: [
					{ type: "array", prefixItems: [{ type: "string" }], items: false },
					{ type: "array", items: { type: "number" } }
				],
				enum: [["a"], [1, 2], ["a", 1], []]
			})
			attest<readonly [] | readonly ["a"] | readonly [1, 2]>(
				T
			).type.toString.snap('readonly [] | readonly ["a"] | readonly [1, 2]')
		})
	})

	describe("not", () => {
		it("true", () => {
			attest<never>(inferred({ type: "string", not: true })).type.toString.snap(
				"never"
			)
		})

		it("false", () => {
			const T = inferred({ type: "string", not: false })
			attest<string>(T).type.toString.snap("string")
		})

		it("empty schema", () => {
			const T = inferred({ not: {} })
			attest<never>(T).type.toString.snap("never")
		})

		it("exact type without base", () => {
			const T = inferred({ not: { type: "string" } })
			attest<number | boolean | object | unknown[] | null>(
				T
			).type.toString.snap("number | boolean | object | unknown[] | null")
		})

		it("runtime-supported exact type", () => {
			const T = jsonSchemaToType({
				type: ["string", "null"],
				not: { type: "null" }
			})
			attest<string>(T.infer).type.toString.snap("string")
		})

		it("number from integer", () => {
			const T = inferred({
				type: ["integer", "string"],
				not: { type: "number" }
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("a type list including integer excludes only the other names", () => {
			const T = inferred({
				enum: ["a", "b", 1],
				not: { type: ["string", "integer"] }
			})
			attest<1>(T).type.toString.snap("1")
		})

		it("const from wide type", () => {
			const T = inferred({ type: "string", not: { const: "" } })
			attest<string>(T).type.toString.snap("string")
		})

		it("const from boolean", () => {
			const T = inferred({ type: "boolean", not: { const: true } })
			attest<false>(T).type.toString.snap("false")
		})

		it("enum", () => {
			const T = inferred({
				enum: ["a", "b", "c", "d"],
				not: { enum: ["a", "c"] }
			})
			attest<"b" | "d">(T).type.toString.snap('"b" | "d"')
		})

		it("type from enum", () => {
			const T = inferred({ enum: ["a", 1, null], not: { type: "string" } })
			attest<1 | null>(T).type.toString.snap("1 | null")
		})

		it("type and enum exclude their intersection", () => {
			const T = inferred({
				enum: ["a", "b", 1],
				not: { enum: ["a", 1], type: "string" }
			})
			attest<"b" | 1>(T)
		})

		it("empty enum", () => {
			const T = inferred({ type: "string", not: { enum: [] } })
			attest<string>(T).type.toString.snap("string")
		})

		it("constrained", () => {
			const T = inferred({
				type: ["string", "null"],
				not: { type: "null", description: "no nulls" }
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("constrained type", () => {
			const T = inferred({
				type: ["string", "null"],
				not: { type: "string", minLength: 1 }
			})
			attest<string | null>(T).type.toString.snap("string | null")
		})

		it("base union from anyOf", () => {
			const T = inferred({
				anyOf: [
					{ type: "string" },
					{ type: "object", properties: { a: { type: "string" } } }
				],
				not: { type: "string" }
			})
			attest<{ a?: string }>(T)
			attest(T).type.toString.snap("{ a?: string }")
		})

		it("in allOf branch", () => {
			const T = inferred({
				allOf: [{ type: ["string", "null"] }, { not: { type: "null" } }]
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("excluding null with nullable", () => {
			// `nullable` adds null to `type`; `not` still rejects it
			const T = inferred({
				type: "string",
				nullable: true,
				not: { type: "null" }
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("object excludes an indexed object", () => {
			const T = inferred({
				anyOf: [
					{ type: "object", additionalProperties: { type: "string" } },
					{ type: "string" }
				],
				not: { type: "object" }
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("array excludes arrays and tuples from oneOf", () => {
			const T = inferred({
				oneOf: [
					{ type: "array", items: { type: "string" } },
					{ type: "array", prefixItems: [{ type: "number" }] },
					{ type: "null" }
				],
				not: { type: "array" }
			})
			attest<null>(T).type.toString.snap("null")
		})

		it("object on an object or array type list", () => {
			const T = inferred({
				type: ["object", "array"],
				items: { type: "string" },
				properties: { a: { type: "number" } },
				not: { type: "object" }
			})
			attest<string[]>(T).type.toString.snap("string[]")
		})

		it("object and array enum", () => {
			const T = inferred({ enum: [{}, []], not: { type: "array" } })
			attest<{}>(T).type.toString.snap("{}")
			const U = inferred({ enum: [{}, []], not: { type: "object" } })
			attest<readonly []>(U).type.toString.snap("readonly []")
		})
	})

	describe("not with object, array and widened values", () => {
		it("object const keeps an open object base", () => {
			// the base also admits objects with more keys, which the const doesn't reject
			const T = inferred({
				type: "object",
				properties: { a: { const: 1 } },
				required: ["a"],
				not: { const: { a: 1 } }
			})
			attest<{ a: 1 }>(T).type.toString.snap("{ a: 1 }")
		})

		it("empty object const keeps a string base", () => {
			const T = inferred({ type: "string", not: { const: {} } })
			attest<string>(T).type.toString.snap("string")
		})

		it("tuple const with an object element", () => {
			const T = inferred({
				type: "array",
				prefixItems: [{ type: "object" }],
				minItems: 1,
				items: false,
				not: { const: [{}] }
			})
			attest<[object]>(T).type.toString.snap("[object]")
		})

		it("object enum keeps its own literals", () => {
			const T = inferred({
				enum: [{ a: 1 }, { a: 2 }, "x"],
				not: { enum: [{ a: 1 }, "x"] }
			})
			attest<{ readonly a: 1 } | { readonly a: 2 }>(T).type.toString.snap(
				"{ readonly a: 1 } | { readonly a: 2 }"
			)
		})

		it("widened const in not", () => {
			const excluded = "a" as string
			const T = inferred({ type: "string", not: { const: excluded } })
			attest<string>(T).type.toString.snap("string")
		})

		it("widened enum in not", () => {
			const excluded: string[] = []
			const T = inferred({ type: "string", not: { enum: excluded } })
			attest<string>(T).type.toString.snap("string")
		})

		it("type name union in not", () => {
			type T = jsonSchema.infer<{
				type: ["string", "number"]
				not: { type: "string" | "number" }
			}>
			attest<string | number>({} as T).type.toString.snap("string | number")
		})

		it("optional const in not", () => {
			type T = jsonSchema.infer<{ type: "string"; not: { const?: "a" } }>
			attest<string>({} as T).type.toString.snap("string")
		})
	})

	describe("type-less not beside arrays and objects", () => {
		it("a non-null branch intersected with a string array", () => {
			const T = inferred({
				allOf: [
					{ not: { type: "null" } },
					{ type: "array", items: { type: "string" } }
				]
			})
			attest<string[]>(T).type.toString.snap("string[]")
		})

		it("an enum beside a non-string branch", () => {
			const T = inferred({
				allOf: [{ not: { type: "string" } }],
				enum: [[1], { a: 1 }, "s"]
			})
			attest<readonly [1] | { readonly a: 1 }>(T).type.toString.snap(
				"{ readonly a: 1 } | readonly [1]"
			)
		})

		it("a not object branch beside an array type", () => {
			const T = inferred({
				type: "array",
				items: { type: "number" },
				allOf: [{ not: { type: "object" } }]
			})
			attest<number[]>(T).type.toString.snap("number[]")
		})

		it("a not array branch beside an object type", () => {
			const T = inferred({
				type: "object",
				allOf: [{ not: { type: "array" } }]
			})
			attest<object>(T).type.toString.snap("object")
		})

		it("an array exclusion without a type", () => {
			// the remaining non-array objects have no clean display, so it stays unknown
			const T = inferred({ not: { type: ["array", "string"] } })
			attest<unknown>(T).type.toString.snap("unknown")
		})
	})

	describe("if/then/else", () => {
		it("all three", () => {
			const T = inferred({
				if: { type: "string" },
				then: { type: "string", minLength: 1 },
				else: { type: "number" }
			})
			attest<string | number>(T).type.toString.snap("string | number")
		})

		it("then and else without if with base", () => {
			const T = inferred({
				type: ["string", "number", "null"],
				then: { type: "string" },
				else: { type: "number" }
			})
			attest<string | number | null>(T).type.toString.snap(
				"string | number | null"
			)
		})

		it("base type list with all three", () => {
			const T = inferred({
				type: ["string", "number", "null"],
				if: { type: "string" },
				then: { minLength: 1 },
				else: { type: "number" }
			})
			// then is unconstrained, so base & (then | else) is the base
			attest<string | number | null>(T).type.toString.snap(
				"string | number | null"
			)
		})

		it("then false", () => {
			const T = inferred({
				if: { type: "string" },
				then: false,
				else: { type: "number" }
			})
			attest<number>(T).type.toString.snap("number")
		})

		it("object base with conditional branches", () => {
			const T = inferred({
				type: "object",
				properties: {
					country: { enum: ["US", "CA"] },
					zip: { type: "string" },
					postal: { type: "string" }
				},
				required: ["country"],
				if: { properties: { country: { const: "US" } } },
				then: { required: ["zip"] },
				else: { required: ["postal"] }
			})
			attest<
				| { country: "US" | "CA"; zip: string; postal?: string }
				| { country: "US" | "CA"; zip?: string; postal: string }
			>(T)
			attest(T).type.toString
				.snap(`	| { country: "CA" | "US"; zip?: string; postal: string }
	| { country: "CA" | "US"; zip: string; postal?: string }`)
		})

		it("nested conditional", () => {
			const T = inferred({
				if: { type: "string" },
				then: { type: "string" },
				else: {
					if: { type: "number" },
					then: { type: "number" },
					else: { type: "null" }
				}
			})
			attest<string | number | null>(T).type.toString.snap(
				"string | number | null"
			)
		})

		it("with const", () => {
			const T = inferred({
				enum: ["a", 1, null],
				if: { type: "string" },
				then: { const: "a" },
				else: { type: "number" }
			})
			attest<"a" | 1>(T).type.toString.snap('"a" | 1')
		})

		it("if: false selects else", () => {
			const T = inferred({
				type: "string",
				if: false,
				then: { const: "a" },
				else: { const: "b" }
			})
			attest<"b">(T).type.toString.snap('"b"')
		})

		it("if: true selects then", () => {
			const T = inferred({
				type: ["string", "number"],
				if: true,
				then: { type: "string" },
				else: { type: "number" }
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("if: true without else keeps the base", () => {
			const T = inferred({ type: "string", if: true, then: { const: "a" } })
			attest<string>(T).type.toString.snap("string")
		})

		it("if: {} keeps both branches", () => {
			// an empty if always matches, so then applies (imprecise but sound)
			const T = inferred({
				type: "string",
				if: {},
				then: { const: "x" },
				else: { const: "y" }
			})
			attest<"x" | "y">(T)
		})

		it("an allOf of if/then rules without else keeps the base", () => {
			// a conditional with one branch contributes nothing
			const T = inferred({
				type: "object",
				properties: { kind: { enum: ["a", "b"] } },
				required: ["kind"],
				allOf: [
					{
						if: { properties: { kind: { const: "a" } } },
						then: { properties: { a: { type: "string" } }, required: ["a"] }
					},
					{
						if: { properties: { kind: { const: "b" } } },
						then: { properties: { b: { type: "number" } }, required: ["b"] }
					}
				]
			})
			attest<{ kind: "a" | "b" }>(T).type.toString.snap('{ kind: "a" | "b" }')
		})
	})

	describe("nullable with composition", () => {
		it("anyOf", () => {
			const T = inferred({
				anyOf: [{ type: "string" }, { type: "number" }],
				nullable: true
			})
			attest<string | number | null>(T).type.toString.snap(
				"string | number | null"
			)
		})

		it("nullable branch", () => {
			const T = inferred({
				oneOf: [{ type: "string", nullable: true }, { type: "number" }]
			})
			attest<string | number | null>(T).type.toString.snap(
				"string | number | null"
			)
		})

		it("nullable branches intersected", () => {
			const T = inferred({
				allOf: [
					{ type: "string", nullable: true },
					{ type: "number", nullable: true }
				]
			})
			attest<null>(T).type.toString.snap("null")
		})
	})

	describe("refs in composition", () => {
		it("allOf inheritance", () => {
			const T = inferred({
				$defs: {
					base: {
						type: "object",
						properties: { id: { type: "string" } },
						required: ["id"]
					}
				},
				allOf: [
					{ $ref: "#/$defs/base" },
					{ properties: { name: { type: "string" } }, required: ["name"] }
				]
			})
			attest<{ id: string; name: string }>(T).type.toString.snap(
				"{ id: string; name: string }"
			)
		})

		it("OpenAPI polymorphism through allOf refs back to the parent", () => {
			const T = inferred({
				$defs: {
					Pet: {
						type: "object",
						properties: {
							petType: { type: "string" },
							name: { type: "string" }
						},
						required: ["petType"],
						discriminator: { propertyName: "petType" },
						oneOf: [{ $ref: "#/$defs/Cat" }, { $ref: "#/$defs/Dog" }]
					},
					Cat: {
						allOf: [
							{ $ref: "#/$defs/Pet" },
							{
								type: "object",
								properties: {
									petType: { const: "cat" },
									meow: { type: "boolean" }
								}
							}
						]
					},
					Dog: {
						allOf: [
							{ $ref: "#/$defs/Pet" },
							{
								type: "object",
								properties: {
									petType: { const: "dog" },
									bark: { type: "string" }
								},
								required: ["bark"]
							}
						]
					}
				},
				type: "object",
				properties: {
					pet: { $ref: "#/$defs/Pet" },
					cat: { $ref: "#/$defs/Cat" }
				}
			})
			attest<
				| { petType: "cat"; name?: string; meow?: boolean }
				| { petType: "dog"; name?: string; bark: string }
				| undefined
			>(T.pet)
			attest<{ petType: "cat"; name?: string; meow?: boolean } | undefined>(
				T.cat
			)
		})

		it("ref with anyOf sibling", () => {
			const T = inferred({
				$defs: { s: { type: ["string", "number", "null"] } },
				$ref: "#/$defs/s",
				anyOf: [{ type: "string" }, { type: "null" }]
			})
			attest<string | null>(T).type.toString.snap("string | null")
		})

		it("$ref with a not sibling", () => {
			const T = inferred({
				$ref: "#/$defs/a",
				not: { type: "null" },
				$defs: { a: { type: ["object", "null"] } }
			})
			attest<object>(T).type.toString.snap("object")
		})

		it("$ref with a nullable sibling", () => {
			const T = inferred({
				$ref: "#/$defs/a",
				nullable: true,
				$defs: { a: { type: "string" } }
			})
			attest<string | null>(T).type.toString.snap("string | null")
		})

		it("recursive through allOf", () => {
			type Node = { id: string; children?: Node[] }
			const T = inferred({
				$defs: {
					node: {
						type: "object",
						allOf: [
							{ properties: { id: { type: "string" } }, required: ["id"] },
							{
								properties: {
									children: { type: "array", items: { $ref: "#/$defs/node" } }
								}
							}
						]
					}
				},
				$ref: "#/$defs/node"
			})
			attest<Node>(T)
		})

		it("recursive AST through a discriminated oneOf", () => {
			const T = inferred({
				$defs: {
					node: {
						type: "object",
						properties: { kind: { enum: ["leaf", "branch"] } },
						required: ["kind"],
						oneOf: [
							{
								properties: {
									kind: { const: "leaf" },
									value: { type: "number" }
								},
								required: ["value"]
							},
							{
								properties: {
									kind: { const: "branch" },
									children: {
										type: "array",
										items: { $ref: "#/$defs/node" }
									}
								},
								required: ["children"]
							}
						]
					}
				},
				$ref: "#/$defs/node"
			})
			const kindOf = (t: typeof T) => {
				const child = t.kind === "branch" ? t.children[0]! : t
				return child.kind === "branch" ? child.children[0]!.kind : child.kind
			}
			attest<"leaf" | "branch">(kindOf(T))
			const valueOf = (t: typeof T) =>
				t.kind === "leaf" ? t.value
				: t.children[0]?.kind === "leaf" ? t.children[0].value
				: undefined
			attest<number | undefined>({} as ReturnType<typeof valueOf>)
		})

		it("shallow cycle through allOf", () => {
			const T = inferred({
				$defs: { a: { allOf: [{ $ref: "#/$defs/a" }] } },
				$ref: "#/$defs/a"
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("shallow cycle through anyOf", () => {
			const T = inferred({
				$defs: { a: { anyOf: [{ $ref: "#/$defs/a" }, { type: "string" }] } },
				$ref: "#/$defs/a"
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("shallow cycle through allOf and anyOf keeps the allOf operand", () => {
			const T = inferred({
				$ref: "#/$defs/a",
				$defs: {
					a: { allOf: [{ $ref: "#/$defs/b" }, { type: "string" }] },
					b: { anyOf: [{ $ref: "#/$defs/a" }, { type: "number" }] }
				}
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("acyclic diamond with a cycle back to the root ref", () => {
			const T = inferred({
				$ref: "#/$defs/a",
				$defs: {
					a: { anyOf: [{ $ref: "#/$defs/b" }, { $ref: "#/$defs/c" }] },
					b: { allOf: [{ $ref: "#/$defs/d" }, { type: "string" }] },
					c: {
						allOf: [{ $ref: "#/$defs/d" }, { type: ["string", "number"] }]
					},
					d: {
						anyOf: [
							{ type: "string", minLength: 1 },
							{ type: "number" },
							{ $ref: "#/$defs/a" }
						]
					}
				}
			})
			attest<string | number>(T).type.toString.snap("string | number")
		})
	})

	describe("$ref siblings by draft", () => {
		it("draft-07 $ref ignores a type sibling", () => {
			const T = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				$ref: "#/definitions/n",
				type: "string",
				definitions: { n: { type: "number" } }
			})
			attest<number>(T).type.toString.snap("number")
		})

		it("draft-07 $ref in an allOf branch ignores its required sibling", () => {
			const T = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				definitions: {
					a: { type: "object", properties: { x: { type: "string" } } }
				},
				allOf: [
					{ $ref: "#/definitions/a", required: ["x"] },
					{ type: "object" }
				]
			})
			attest<{ x?: string }>(T).type.toString.snap("{ x?: string }")
		})

		it("draft-04 $ref ignores a nullable sibling", () => {
			const T = inferred({
				$schema: "http://json-schema.org/draft-04/schema#",
				definitions: { a: { type: "string" } },
				type: "object",
				properties: { p: { $ref: "#/definitions/a", nullable: true } }
			})
			attest<{ p?: string }>(T).type.toString.snap("{ p?: string }")
		})

		it("2020-12 $ref intersects a type sibling", () => {
			const T = inferred({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				$ref: "#/$defs/n",
				type: "string",
				$defs: { n: { type: "number" } }
			})
			attest<never>(T).type.toString.snap("never")
		})

		it("$ref without $schema intersects a type sibling", () => {
			const T = inferred({
				$ref: "#/$defs/n",
				type: "string",
				$defs: { n: { type: ["number", "string"] } }
			})
			attest<string>(T).type.toString.snap("string")
		})
	})

	describe("composed object display", () => {
		// TS 7 orders an intersection's members by when their types were
		// created, so keys from different parts can precede the base's
		it("base and allOf properties merge regardless of keyword order", () => {
			const T = inferred({
				type: "object",
				allOf: [{ properties: { c: { type: "string" } } }],
				properties: { a: { type: "string" }, b: { type: "number" } },
				required: ["b"]
			})
			attest<{ a?: string; b: number; c?: string }>(T).type.toString.snap(
				"{ c?: string; a?: string; b: number }"
			)
		})

		it("branch redeclaring a base property keeps the base position", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" }, b: { type: "number" } },
				anyOf: [
					{
						properties: { b: { const: 1 }, c: { type: "string" } },
						required: ["c"]
					}
				]
			})
			attest<{ a?: string; b?: 1; c: string }>(T).type.toString.snap(
				"{ a?: string; b?: 1; c: string }"
			)
		})

		it("allOf and conditional properties merge with base", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				if: { required: ["a"] },
				then: { properties: { z: { type: "string" } }, required: ["z"] },
				else: { properties: { y: { type: "string" } } },
				allOf: [{ properties: { m: { type: "number" } } }]
			})
			attest<
				| { a?: string; m?: number; z: string }
				| { a?: string; m?: number; y?: string }
			>(T).type.toString.snap(`	| { a?: string; y?: string; m?: number }
	| { a?: string; z: string; m?: number }`)
		})

		it("anyOf of objects differing only in constraints", () => {
			// each branch is its own object type, and TS only reduces a union by
			// identity (an accepted display imprecision)
			const T = inferred({
				type: "object",
				anyOf: [
					{ properties: { a: { type: "string" } }, required: ["a"] },
					{
						properties: { a: { type: "string" } },
						required: ["a"],
						minProperties: 2
					}
				]
			})
			attest<{ a: string }, typeof T>()
			attest<typeof T, { a: string }>()
			attest(T).type.toString.snap("{ a: string } | { a: string }")
		})
	})

	describe("hand-written schema types", () => {
		it("mutable allOf", () => {
			attest<
				{ a: string; b?: number },
				jsonSchema.infer<{
					type: "object"
					allOf: [
						{ properties: { a: { type: "string" } }; required: ["a"] },
						{ properties: { b: { type: "number" } } }
					]
				}>
			>()
		})

		it("anyOf array of schemas", () => {
			type T = jsonSchema.infer<{
				anyOf: ({ type: "string" } | { type: "number" })[]
			}>
			attest<string | number, T>()
		})

		it("allOf array of schemas", () => {
			// non-tuple allOf can't be intersected element-wise (sound superset)
			type T = jsonSchema.infer<{ allOf: { type: "string" }[] }>
			attest<unknown, T>()
		})

		it("widened anyOf branch", () => {
			const branch = { type: "string" } as JsonSchema
			const T = inferred({ anyOf: [branch, { type: "number" }] })
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("widened allOf branch", () => {
			const branch = { type: "string" } as JsonSchema
			const T = inferred({ allOf: [branch, { type: "number" }] })
			attest<number>(T).type.toString.snap("number")
		})

		it("union of composition schemas", () => {
			attest<
				string | number,
				jsonSchema.infer<
					{ anyOf: [{ type: "string" }] } | { allOf: [{ type: "number" }] }
				>
			>()
		})
	})

	describe("validation", () => {
		it("bad type in not", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					not: { type: "boolea" }
				})
			).type.errors(`Did you mean '"boolean"'?`)
		})

		it("bad type in if/then/else", () => {
			attest(() =>
				inferred({
					if: { type: "string" },
					then: { type: "string" },
					// @ts-expect-error
					else: { type: "integr" }
				})
			).type.errors(`Did you mean '"integer"'?`)
		})

		it("bad type in nested composition", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: {
							anyOf: [
								{ type: "string" },
								{
									allOf: [
										// @ts-expect-error
										{ type: "objet" }
									]
								}
							]
						}
					}
				})
			).type.errors(`Did you mean '"object"'?`)
		})

		it("errors in sibling branches", () => {
			attest(() =>
				inferred({
					anyOf: [
						// @ts-expect-error
						{ type: "strng" },
						// @ts-expect-error
						{ type: "nmber" }
					]
				})
			).type.errors(`Did you mean '"string"'?`)
		})

		it("bad type beside a true branch", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					allOf: [true, { type: "strin" }]
				})
			).type.errors(`Type '"strin"' is not assignable to type 'TypeName'`)
		})

		it("allOf not an array", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					allOf: { type: "string" }
				})
			).type.errors.snap(
				"Object literal may only specify known properties, and 'type' does not exist in type 'readonly (boolean | object)[]'."
			)
		})

		it("non-schema branch", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					anyOf: [{ type: "string" }, "number"]
				})
			).type.errors("JSON Schema must be an object or a boolean (was string)")
		})

		it("null branch", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					oneOf: [null]
				})
			).type.errors("JSON Schema must be an object or a boolean (was null)")
		})

		it("array as not", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					not: [{ type: "string" }]
				})
			).type.errors("JSON Schema must be an object or a boolean (was array)")
		})

		it("const and enum in branch", () => {
			attest(
				inferred({ anyOf: [{ const: "a", enum: ["a", "b"] }] })
			).type.toString.snap('"a"')
		})

		it("invalid count in branch", () => {
			attest(() =>
				inferred({
					allOf: [
						{ type: "string" },
						// @ts-expect-error
						{ minLength: -1 }
					]
				})
			).type.errors("minLength must be a non-negative integer (was -1)")
		})

		it("wrong value kind in branch", () => {
			attest(() =>
				inferred({
					anyOf: [
						{
							type: "string",
							// @ts-expect-error
							pattern: 5
						}
					]
				})
			).type.errors(`Type 'number' is not assignable to type 'string | RegExp'`)
		})

		it("empty oneOf in a branch beside true", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					allOf: [true, { oneOf: [] }]
				})
			).type.errors("Source has 0 element(s) but target requires 1")
		})

		it("unresolvable ref beside true", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					allOf: [true, { $ref: "#/$defs/nope" }],
					$defs: { a: {} }
				})
			).type.errors(
				`'"#/$defs/nope"' is not assignable to type '"#" | "#/$defs/a"'`
			)
		})

		it("ref in nested branch resolves against root", () => {
			const T = inferred({
				$defs: { a: { type: "string" } },
				allOf: [
					{ anyOf: [{ not: { $ref: "#/$defs/a" } }, { $ref: "#/$defs/a" }] }
				]
			})
			attest<unknown>(T)
		})

		it("completes refs in branch", () => {
			attest(() =>
				inferred({
					$defs: { node: true },
					// @ts-expect-error
					oneOf: [{ $ref: "#/$defs/no" }]
				})
			).completions({ "#/$defs/no": ["#/$defs/node"] })
		})

		it("completes keywords in anyOf branch", () => {
			attest(() =>
				// prettier-ignore
				inferred({ anyOf: [{ type: "number", "multipl": 2 }] })
			).completions({ multipl: ["multipleOf"] })
		})

		it("completes keywords in invalid branch", () => {
			attest(() =>
				inferred({
					allOf: [
						// prettier-ignore
						// @ts-expect-error
						{ type: "strin", "minLe": 1 }
					]
				})
			).completions({ minLe: ["minLength"], strin: ["string"] })
		})

		it("completes type in a branch beside a boolean", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					oneOf: [true, { type: "boo" }]
				})
			).completions({ boo: ["boolean"] })
		})

		it("unknown keywords in branches are allowed", () => {
			const T = inferred({
				anyOf: [
					{ type: "string", "x-a": 1 },
					{ type: "null", foo: [] }
				]
			})
			attest<string | null>(T)
		})
	})

	describe("required across composition", () => {
		it("required in a branch with properties is only checked to be strings", () => {
			// a branch applies to the same instance as the schemas around it
			const T = inferred({
				oneOf: [
					{
						properties: { name: { type: "string" } },
						required: ["nme"]
					}
				]
			})
			attest<
				| string
				| number
				| boolean
				| unknown[]
				| { name?: string; nme: unknown }
				| null
			>(T).type.toString.snap(`	| string
	| number
	| boolean
	| unknown[]
	| { name?: string; nme: unknown }
	| null`)
		})

		it("parent required referencing an allOf branch property", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { b: { type: "string" } },
					required: ["a", "b"],
					allOf: [{ properties: { a: { type: "number" } } }]
				})
			).type.errors.is("")
		})

		it("required in an allOf branch isn't checked against the declared keys", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { a: true },
					allOf: [{ properties: { b: true }, required: ["x"] }]
				})
			).type.errors.is("")
		})

		it("required in a not branch isn't checked against its properties", () => {
			attest(() =>
				inferred({
					type: "object",
					not: { properties: { a: {} }, required: ["b"] }
				})
			).type.errors.is("")
		})

		it("required typo in a self-contained node with not", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					// @ts-expect-error
					required: ["b"],
					not: { type: "null" }
				})
			).type.errors(`Type '"b"' is not assignable to type '"a"'`)
		})

		it("a required key in a property of a branch completes the property's keys", () => {
			// another branch's `b` could declare the key
			attest(() =>
				inferred({
					type: "object",
					properties: { a: true },
					allOf: [
						{
							properties: {
								b: {
									properties: { cat: true, cow: true, dog: true },
									required: ["c"]
								}
							}
						}
					]
				})
			).completions({ c: ["cat", "cow"] })
		})

		it("required in oneOf branch referencing an enclosing allOf property is valid", () => {
			const T = inferred({
				type: "object",
				allOf: [{ properties: { a: { type: "string" } } }],
				oneOf: [{ properties: { b: true }, required: ["a"] }]
			})
			attest<{ a: string; b?: unknown }>(T).type.toString.snap(
				"{ a: string; b?: unknown }"
			)
		})
	})

	describe("spreading a jsonSchema value", () => {
		const str = jsonSchema({ type: "string" })

		it("an overridden type", () => {
			const S = jsonSchema({ ...str, type: "number" })
			attest(S.infer).type.toString.snap("number")
		})

		it("a nested spread infers from the schema", () => {
			const S = jsonSchema({
				type: "object",
				properties: { a: { ...str, type: "number" } }
			})
			attest<{ a?: number }>(S.infer).type.toString.snap("{ a?: number }")
		})
	})

	describe("composing jsonSchema values", () => {
		const str = jsonSchema({ type: "string" })
		const user = jsonSchema({
			type: "object",
			properties: { name: { type: "string" } },
			required: ["name"]
		})
		const pet = jsonSchema({
			type: "object",
			properties: { kind: { const: "pet" } },
			required: ["kind"]
		})

		it("allOf", () => {
			const S = jsonSchema({ allOf: [user, pet] })
			attest<{ name: string; kind: "pet" }>(S.infer).type.toString.snap(
				'{ name: string; kind: "pet" }'
			)
		})

		it("properties", () => {
			const S = jsonSchema({
				type: "object",
				properties: { u: user, s: str },
				required: ["u"]
			})
			attest<{ u: { name: string }; s?: string }>(S.infer).type.toString.snap(
				"{ u: { name: string }; s?: string }"
			)
		})

		it("an exact not", () => {
			// limitation: a jsonSchema value in not excludes nothing, since its brand key makes it inexact (a sound fix must require a key besides the brand's)
			const S = jsonSchema({
				enum: ["a", "b"],
				not: jsonSchema({ const: "a" })
			})
			attest(S.infer).type.toString.snap('"a" | "b"')
		})

		it("a jsonSchema.as value in anyOf", () => {
			const a = jsonSchema.as<{ a: 1 }>({ type: "object" })
			const S = jsonSchema({ anyOf: [a, str] })
			attest<{ a: 1 } | string>(S.infer).type.toString.snap("string | { a: 1 }")
		})

		it("a composed value's refs resolve against the new root", () => {
			const tree = jsonSchema({
				type: "object",
				properties: {
					value: { type: "number" },
					children: { type: "array", items: { $ref: "#" } }
				}
			})
			const S = jsonSchema({
				$defs: { t: tree },
				type: "array",
				items: { $ref: "#/$defs/t" }
			})
			// tsrs predates microsoft/TypeScript#64556, so it prints recursive arrays deeper
			if (getChecker() !== "tsrs") {
				attest(S.infer).type.toString.snap(
					"{ value?: number; children?: cyclic[] }[]"
				)
			}
			type children = NonNullable<(typeof S.infer)[number]["children"]>
			attest<number | undefined, children[number][number]["value"]>()
		})
	})

	describe("any-valued properties in merges", () => {
		it("an any property merged with a typed one", () => {
			// limitation: an `any` subschema survives an allOf merge depending on branch order (intersectValues' equivalence shortcut returns the left side), accepted since any accepts every value
			const T = inferred({
				type: "object",
				properties: { a: {} as any },
				allOf: [{ properties: { a: { type: "number" } } }]
			})
			attest(T).type.toString.snap("{ a?: any }")
		})

		it("a typed property merged with an any one", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				allOf: [{ properties: { a: {} as any } }]
			})
			attest<{ a?: string }>(T).type.toString.snap("{ a?: string }")
		})

		it("any items merged with typed items", () => {
			// limitation: same as above in intersectArrays
			const T = inferred({
				allOf: [
					{ type: "array", items: {} as any },
					{ type: "array", items: { type: "number" } }
				]
			})
			attest(T).type.toString.snap("any[]")
		})
	})

	describe("depth and width", () => {
		it("thirty anyOf branches", () => {
			type T = jsonSchema.infer<{
				anyOf: [
					{ const: 0 },
					{ const: 1 },
					{ const: 2 },
					{ const: 3 },
					{ const: 4 },
					{ const: 5 },
					{ const: 6 },
					{ const: 7 },
					{ const: 8 },
					{ const: 9 },
					{ const: 10 },
					{ const: 11 },
					{ const: 12 },
					{ const: 13 },
					{ const: 14 },
					{ const: 15 },
					{ const: 16 },
					{ const: 17 },
					{ const: 18 },
					{ const: 19 },
					{ const: 20 },
					{ const: 21 },
					{ const: 22 },
					{ const: 23 },
					{ const: 24 },
					{ const: 25 },
					{ const: 26 },
					{ const: 27 },
					{ const: 28 },
					{ const: 29 }
				]
			}>
			attest<
				| 0
				| 1
				| 2
				| 3
				| 4
				| 5
				| 6
				| 7
				| 8
				| 9
				| 10
				| 11
				| 12
				| 13
				| 14
				| 15
				| 16
				| 17
				| 18
				| 19
				| 20
				| 21
				| 22
				| 23
				| 24
				| 25
				| 26
				| 27
				| 28
				| 29,
				T
			>()
		})

		it("fifty allOf branches", () => {
			type Branch = { type: ["string", "number"] }
			type T = jsonSchema.infer<{
				allOf: [
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					Branch,
					{ type: "string" }
				]
			}>
			attest<string, T>()
		})

		it("allOf of forty branches sharing a property", () => {
			type branches<acc extends unknown[]> =
				acc["length"] extends 40 ? acc
				:	branches<
						[
							...acc,
							{ properties: { id: { type: "string" } }; required: ["id"] }
						]
					>
			type T = jsonSchema.infer<{ type: "object"; allOf: branches<[]> }>
			attest({} as T).type.toString.snap("{ id: string }")
			attest({} as T["id"]).type.toString.snap("string")
		})

		it("sixty discriminated oneOf branches with a base", () => {
			type branches<acc extends unknown[]> =
				acc["length"] extends 60 ? acc
				:	branches<
						[
							...acc,
							{
								properties: {
									kind: { const: acc["length"] }
									value: { type: "string" }
								}
								required: ["value"]
							}
						]
					>
			type T = jsonSchema.infer<{
				type: "object"
				properties: { kind: { type: "number" } }
				required: ["kind"]
				oneOf: branches<[]>
			}>
			type Expected =
				branches<[]>[number] extends infer branch ?
					branch extends { properties: { kind: { const: infer kind } } } ?
						{ kind: kind; value: string }
					:	never
				:	never
			attest<Expected, T>()
			attest<T, Expected>()
		})

		it("sixty allOf branches with distinct required properties", () => {
			type branches<acc extends unknown[]> =
				acc["length"] extends 60 ? acc
				:	branches<
						[
							...acc,
							{
								properties: { [k in `p${acc["length"]}`]: { type: "number" } }
								required: [`p${acc["length"]}`]
							}
						]
					>
			type T = jsonSchema.infer<{ type: "object"; allOf: branches<[]> }>
			attest<0 extends 1 & T["p59"] ? true : false>(false)
			attest<number>({} as T["p0"])
			attest<number>({} as T["p59"])
		})

		it("allOf nested forty deep", () => {
			type nest<s, depth extends 1[]> =
				depth["length"] extends 40 ? s : nest<{ allOf: [s] }, [...depth, 1]>
			type T = jsonSchema.infer<
				nest<
					{
						type: "object"
						properties: { a: { type: "string" } }
						required: ["a"]
					},
					[]
				>
			>
			attest<{ a: string }, T>()
		})

		it("allOf with a sibling branch nested forty deep", () => {
			type nest<s, depth extends 1[]> =
				depth["length"] extends 40 ? s
				:	nest<{ allOf: [s, { type: "object" }] }, [...depth, 1]>
			type T = jsonSchema.infer<
				nest<
					{
						type: "object"
						properties: { a: { type: "string" } }
						required: ["a"]
					},
					[]
				>
			>
			attest<{ a: string }, T>()
		})

		it("anyOf nested twenty deep", () => {
			type nest<s, depth extends 1[]> =
				depth["length"] extends 20 ? s
				:	nest<{ anyOf: [s, { const: depth["length"] }] }, [...depth, 1]>
			type T = jsonSchema.infer<nest<{ type: "string" }, []>>
			attest<
				| string
				| 0
				| 1
				| 2
				| 3
				| 4
				| 5
				| 6
				| 7
				| 8
				| 9
				| 10
				| 11
				| 12
				| 13
				| 14
				| 15
				| 16
				| 17
				| 18
				| 19,
				T
			>()
		})

		it("mixed allOf/anyOf/oneOf with sibling keywords nested forty deep", () => {
			type L0 = {
				type: "object"
				properties: { a: { type: "string" } }
				required: ["a"]
			}
			type L1 = {
				type: "object"
				allOf: [L0]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L2 = {
				type: "object"
				allOf: [L1]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L3 = {
				type: "object"
				allOf: [L2]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L4 = {
				type: "object"
				allOf: [L3]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L5 = {
				type: "object"
				allOf: [L4]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L6 = {
				type: "object"
				allOf: [L5]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L7 = {
				type: "object"
				allOf: [L6]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L8 = {
				type: "object"
				allOf: [L7]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L9 = {
				type: "object"
				allOf: [L8]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L10 = {
				type: "object"
				allOf: [L9]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L11 = {
				type: "object"
				allOf: [L10]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L12 = {
				type: "object"
				allOf: [L11]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L13 = {
				type: "object"
				allOf: [L12]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L14 = {
				type: "object"
				allOf: [L13]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L15 = {
				type: "object"
				allOf: [L14]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L16 = {
				type: "object"
				allOf: [L15]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L17 = {
				type: "object"
				allOf: [L16]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L18 = {
				type: "object"
				allOf: [L17]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L19 = {
				type: "object"
				allOf: [L18]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L20 = {
				type: "object"
				allOf: [L19]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L21 = {
				type: "object"
				allOf: [L20]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L22 = {
				type: "object"
				allOf: [L21]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L23 = {
				type: "object"
				allOf: [L22]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L24 = {
				type: "object"
				allOf: [L23]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L25 = {
				type: "object"
				allOf: [L24]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L26 = {
				type: "object"
				allOf: [L25]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L27 = {
				type: "object"
				allOf: [L26]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L28 = {
				type: "object"
				allOf: [L27]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L29 = {
				type: "object"
				allOf: [L28]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L30 = {
				type: "object"
				allOf: [L29]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L31 = {
				type: "object"
				allOf: [L30]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L32 = {
				type: "object"
				allOf: [L31]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L33 = {
				type: "object"
				allOf: [L32]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L34 = {
				type: "object"
				allOf: [L33]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L35 = {
				type: "object"
				allOf: [L34]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L36 = {
				type: "object"
				allOf: [L35]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L37 = {
				type: "object"
				allOf: [L36]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L38 = {
				type: "object"
				allOf: [L37]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L39 = {
				type: "object"
				allOf: [L38]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			type L40 = {
				type: "object"
				allOf: [L39]
				anyOf: [{ type: "object" }]
				oneOf: [{ type: "object" }]
				not: { type: "null" }
			}
			attest<{ a: string }, jsonSchema.infer<L40>>()
		})

		it("nullable oneOf nested forty deep", () => {
			type nest<s, depth extends 1[]> =
				depth["length"] extends 40 ? s
				:	nest<{ nullable: true; oneOf: [s] }, [...depth, 1]>
			type T = jsonSchema.infer<nest<{ type: "string" }, []>>
			attest({} as T).type.toString.snap("string | null")
		})

		it("$ref with an allOf sibling nested forty deep", () => {
			type nest<s, depth extends 1[]> =
				depth["length"] extends 40 ? s
				:	nest<{ $ref: "#/$defs/o"; allOf: [s] }, [...depth, 1]>
			type T = jsonSchema.infer<
				{ $defs: { o: { type: "object" } } } & nest<
					{
						type: "object"
						properties: { a: { type: "string" } }
						required: ["a"]
					},
					[]
				>
			>
			attest({} as T).type.toString.snap("{ a: string }")
		})

		it("if/then/else nested forty deep", () => {
			type nest<s, depth extends 1[]> =
				depth["length"] extends 40 ? s
				:	nest<
						{ if: { type: "string" }; then: s; else: { type: "null" } },
						[...depth, 1]
					>
			type T = jsonSchema.infer<
				nest<
					{
						type: "object"
						properties: { a: { type: "string" } }
						required: ["a"]
					},
					[]
				>
			>
			attest({} as T).type.toString.snap("{ a: string } | null")
		})

		it("else-if chain forty deep", () => {
			// written out rather than built by a generic alias, which costs TS
			// another level of instantiation depth per level of nesting
			type C40 = {
				type: "object"
				properties: { z: { type: "string" } }
				required: ["z"]
			}
			type C39 = {
				type: "object"
				if: { properties: { k: { const: 39 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C40
			}
			type C38 = {
				type: "object"
				if: { properties: { k: { const: 38 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C39
			}
			type C37 = {
				type: "object"
				if: { properties: { k: { const: 37 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C38
			}
			type C36 = {
				type: "object"
				if: { properties: { k: { const: 36 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C37
			}
			type C35 = {
				type: "object"
				if: { properties: { k: { const: 35 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C36
			}
			type C34 = {
				type: "object"
				if: { properties: { k: { const: 34 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C35
			}
			type C33 = {
				type: "object"
				if: { properties: { k: { const: 33 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C34
			}
			type C32 = {
				type: "object"
				if: { properties: { k: { const: 32 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C33
			}
			type C31 = {
				type: "object"
				if: { properties: { k: { const: 31 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C32
			}
			type C30 = {
				type: "object"
				if: { properties: { k: { const: 30 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C31
			}
			type C29 = {
				type: "object"
				if: { properties: { k: { const: 29 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C30
			}
			type C28 = {
				type: "object"
				if: { properties: { k: { const: 28 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C29
			}
			type C27 = {
				type: "object"
				if: { properties: { k: { const: 27 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C28
			}
			type C26 = {
				type: "object"
				if: { properties: { k: { const: 26 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C27
			}
			type C25 = {
				type: "object"
				if: { properties: { k: { const: 25 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C26
			}
			type C24 = {
				type: "object"
				if: { properties: { k: { const: 24 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C25
			}
			type C23 = {
				type: "object"
				if: { properties: { k: { const: 23 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C24
			}
			type C22 = {
				type: "object"
				if: { properties: { k: { const: 22 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C23
			}
			type C21 = {
				type: "object"
				if: { properties: { k: { const: 21 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C22
			}
			type C20 = {
				type: "object"
				if: { properties: { k: { const: 20 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C21
			}
			type C19 = {
				type: "object"
				if: { properties: { k: { const: 19 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C20
			}
			type C18 = {
				type: "object"
				if: { properties: { k: { const: 18 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C19
			}
			type C17 = {
				type: "object"
				if: { properties: { k: { const: 17 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C18
			}
			type C16 = {
				type: "object"
				if: { properties: { k: { const: 16 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C17
			}
			type C15 = {
				type: "object"
				if: { properties: { k: { const: 15 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C16
			}
			type C14 = {
				type: "object"
				if: { properties: { k: { const: 14 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C15
			}
			type C13 = {
				type: "object"
				if: { properties: { k: { const: 13 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C14
			}
			type C12 = {
				type: "object"
				if: { properties: { k: { const: 12 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C13
			}
			type C11 = {
				type: "object"
				if: { properties: { k: { const: 11 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C12
			}
			type C10 = {
				type: "object"
				if: { properties: { k: { const: 10 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C11
			}
			type C9 = {
				type: "object"
				if: { properties: { k: { const: 9 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C10
			}
			type C8 = {
				type: "object"
				if: { properties: { k: { const: 8 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C9
			}
			type C7 = {
				type: "object"
				if: { properties: { k: { const: 7 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C8
			}
			type C6 = {
				type: "object"
				if: { properties: { k: { const: 6 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C7
			}
			type C5 = {
				type: "object"
				if: { properties: { k: { const: 5 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C6
			}
			type C4 = {
				type: "object"
				if: { properties: { k: { const: 4 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C5
			}
			type C3 = {
				type: "object"
				if: { properties: { k: { const: 3 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C4
			}
			type C2 = {
				type: "object"
				if: { properties: { k: { const: 2 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C3
			}
			type C1 = {
				type: "object"
				if: { properties: { k: { const: 1 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C2
			}
			type C0 = {
				type: "object"
				if: { properties: { k: { const: 0 } } }
				then: { properties: { v: { type: "string" } }; required: ["v"] }
				else: C1
			}
			type T = jsonSchema.infer<C0>
			// each level's `then` is a distinct (if identical) object type
			attest<{ v: string } | { z: string }, T>()
			attest<T, { v: string } | { z: string }>()
		})

		it("typed else-if chain with not nested forty deep", () => {
			// limitation: a typed if/then/else node with `not` or `nullable` costs an extra level per node, so a circularity error (any) from 32 levels (without them, 46 pass)
			// prettier-ignore
			// @ts-ignore
			type T = jsonSchema.infer<{ type: "object"; if: { properties: { k: { const: 0 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 1 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 2 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 3 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 4 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 5 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 6 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 7 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 8 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 9 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 10 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 11 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 12 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 13 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 14 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 15 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 16 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 17 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 18 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 19 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 20 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 21 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 22 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 23 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 24 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 25 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 26 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 27 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 28 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 29 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 30 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 31 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 32 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 33 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 34 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 35 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 36 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 37 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 38 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; if: { properties: { k: { const: 39 } } }; then: { properties: { v: { type: "string" } }; required: ["v"] }; else: { type: "object"; properties: { z: { type: "string" } }; required: ["z"] }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }; not: { type: "null" } }>
			attest({} as T).type.toString.snap("any")
		})

		it("validates oneOf nested forty-eight deep", () => {
			attest(() =>
				// prettier-ignore
				inferred({ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ oneOf: [{ type: "object", properties: { a: { type: "string" } }, required: ["a"] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] })
			).type.errors.is("")
		})

		it("validates allOf around a boolean nested forty-eight deep", () => {
			attest(() =>
				// prettier-ignore
				inferred({ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [{ allOf: [true] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] }] })
			).type.errors.is("")
		})

		it("validates properties nested thirty-five deep", () => {
			attest(() =>
				// prettier-ignore
				inferred({ type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "object", properties: { a: { type: "string" } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } })
			).type.errors.is("")
		})

		it("validates $defs nested forty-eight deep", () => {
			attest(() =>
				// prettier-ignore
				inferred({ $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { $defs: { a: { type: "object", properties: { a: { type: "string" } }, required: ["a"] } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } })
			).type.errors.is("")
		})

		it("validates allOf in properties nested twenty deep", () => {
			attest(() =>
				// prettier-ignore
				inferred({ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { allOf: [{ type: "object", properties: { a: { type: "string" } }, required: ["a"] }] } } }] } } }] } } }] } } }] } } }] } } }] } } }] } } }] } } }] } } }] } } }] } } }] } } }] } } }] } } }] } } }] } } }] } } }] } } }] } } })
			).type.errors.is("")
		})
	})

	describe("allOf union limit", () => {
		it("allOf of three if/then/else rules keeps every combination", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{
						if: { properties: { k: { const: 0 } } },
						then: { required: ["v0"] },
						else: { properties: { v0: false } }
					},
					{
						if: { properties: { k: { const: 1 } } },
						then: { required: ["v1"] },
						else: { properties: { v1: false } }
					},
					{
						if: { properties: { k: { const: 2 } } },
						then: { required: ["v2"] },
						else: { properties: { v2: false } }
					}
				]
			})
			type rule<k extends string> = { [_ in k]: unknown } | { [_ in k]?: never }
			attest<rule<"v0"> & rule<"v1"> & rule<"v2">, typeof T>()
			attest<typeof T, rule<"v0"> & rule<"v1"> & rule<"v2">>()
		})

		it("a fourth rule past the limit is widened soundly", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{
						if: { properties: { k: { const: 0 } } },
						then: { required: ["v0"] },
						else: { properties: { v0: false } }
					},
					{
						if: { properties: { k: { const: 1 } } },
						then: { required: ["v1"] },
						else: { properties: { v1: false } }
					},
					{
						if: { properties: { k: { const: 2 } } },
						then: { required: ["v2"] },
						else: { properties: { v2: false } }
					},
					{
						if: { properties: { k: { const: 3 } } },
						then: { required: ["v3"] },
						else: { properties: { v3: false } }
					}
				]
			})
			type T = typeof T
			// valid with v3 present or absent, since the fourth rule is ignored
			attest<true>(
				{} as [{ v0: 1; v1: 1; v2: 1; v3: 1 }] extends [T] ? true : false
			)
			attest<true>({} as [{ v0: 1; v1: 1; v2: 1 }] extends [T] ? true : false)
		})

		it("allOf of thirty if/then/else rules", () => {
			// past three union-producing branches, a branch's then/else are ignored
			attest.instantiations([29300, "instantiations"])
			return inferred({
				type: "object",
				allOf: [
					{
						if: { properties: { k: { const: 0 } } },
						then: { required: ["v0"] },
						else: { properties: { v0: false } }
					},
					{
						if: { properties: { k: { const: 1 } } },
						then: { required: ["v1"] },
						else: { properties: { v1: false } }
					},
					{
						if: { properties: { k: { const: 2 } } },
						then: { required: ["v2"] },
						else: { properties: { v2: false } }
					},
					{
						if: { properties: { k: { const: 3 } } },
						then: { required: ["v3"] },
						else: { properties: { v3: false } }
					},
					{
						if: { properties: { k: { const: 4 } } },
						then: { required: ["v4"] },
						else: { properties: { v4: false } }
					},
					{
						if: { properties: { k: { const: 5 } } },
						then: { required: ["v5"] },
						else: { properties: { v5: false } }
					},
					{
						if: { properties: { k: { const: 6 } } },
						then: { required: ["v6"] },
						else: { properties: { v6: false } }
					},
					{
						if: { properties: { k: { const: 7 } } },
						then: { required: ["v7"] },
						else: { properties: { v7: false } }
					},
					{
						if: { properties: { k: { const: 8 } } },
						then: { required: ["v8"] },
						else: { properties: { v8: false } }
					},
					{
						if: { properties: { k: { const: 9 } } },
						then: { required: ["v9"] },
						else: { properties: { v9: false } }
					},
					{
						if: { properties: { k: { const: 10 } } },
						then: { required: ["v10"] },
						else: { properties: { v10: false } }
					},
					{
						if: { properties: { k: { const: 11 } } },
						then: { required: ["v11"] },
						else: { properties: { v11: false } }
					},
					{
						if: { properties: { k: { const: 12 } } },
						then: { required: ["v12"] },
						else: { properties: { v12: false } }
					},
					{
						if: { properties: { k: { const: 13 } } },
						then: { required: ["v13"] },
						else: { properties: { v13: false } }
					},
					{
						if: { properties: { k: { const: 14 } } },
						then: { required: ["v14"] },
						else: { properties: { v14: false } }
					},
					{
						if: { properties: { k: { const: 15 } } },
						then: { required: ["v15"] },
						else: { properties: { v15: false } }
					},
					{
						if: { properties: { k: { const: 16 } } },
						then: { required: ["v16"] },
						else: { properties: { v16: false } }
					},
					{
						if: { properties: { k: { const: 17 } } },
						then: { required: ["v17"] },
						else: { properties: { v17: false } }
					},
					{
						if: { properties: { k: { const: 18 } } },
						then: { required: ["v18"] },
						else: { properties: { v18: false } }
					},
					{
						if: { properties: { k: { const: 19 } } },
						then: { required: ["v19"] },
						else: { properties: { v19: false } }
					},
					{
						if: { properties: { k: { const: 20 } } },
						then: { required: ["v20"] },
						else: { properties: { v20: false } }
					},
					{
						if: { properties: { k: { const: 21 } } },
						then: { required: ["v21"] },
						else: { properties: { v21: false } }
					},
					{
						if: { properties: { k: { const: 22 } } },
						then: { required: ["v22"] },
						else: { properties: { v22: false } }
					},
					{
						if: { properties: { k: { const: 23 } } },
						then: { required: ["v23"] },
						else: { properties: { v23: false } }
					},
					{
						if: { properties: { k: { const: 24 } } },
						then: { required: ["v24"] },
						else: { properties: { v24: false } }
					},
					{
						if: { properties: { k: { const: 25 } } },
						then: { required: ["v25"] },
						else: { properties: { v25: false } }
					},
					{
						if: { properties: { k: { const: 26 } } },
						then: { required: ["v26"] },
						else: { properties: { v26: false } }
					},
					{
						if: { properties: { k: { const: 27 } } },
						then: { required: ["v27"] },
						else: { properties: { v27: false } }
					},
					{
						if: { properties: { k: { const: 28 } } },
						then: { required: ["v28"] },
						else: { properties: { v28: false } }
					},
					{
						if: { properties: { k: { const: 29 } } },
						then: { required: ["v29"] },
						else: { properties: { v29: false } }
					}
				]
			})
		})

		it("allOf of thirty two-branch anyOfs", () => {
			attest.instantiations([28100, "instantiations"])
			return inferred({
				type: "object",
				allOf: [
					{ anyOf: [{ required: ["a0"] }, { required: ["b0"] }] },
					{ anyOf: [{ required: ["a1"] }, { required: ["b1"] }] },
					{ anyOf: [{ required: ["a2"] }, { required: ["b2"] }] },
					{ anyOf: [{ required: ["a3"] }, { required: ["b3"] }] },
					{ anyOf: [{ required: ["a4"] }, { required: ["b4"] }] },
					{ anyOf: [{ required: ["a5"] }, { required: ["b5"] }] },
					{ anyOf: [{ required: ["a6"] }, { required: ["b6"] }] },
					{ anyOf: [{ required: ["a7"] }, { required: ["b7"] }] },
					{ anyOf: [{ required: ["a8"] }, { required: ["b8"] }] },
					{ anyOf: [{ required: ["a9"] }, { required: ["b9"] }] },
					{ anyOf: [{ required: ["a10"] }, { required: ["b10"] }] },
					{ anyOf: [{ required: ["a11"] }, { required: ["b11"] }] },
					{ anyOf: [{ required: ["a12"] }, { required: ["b12"] }] },
					{ anyOf: [{ required: ["a13"] }, { required: ["b13"] }] },
					{ anyOf: [{ required: ["a14"] }, { required: ["b14"] }] },
					{ anyOf: [{ required: ["a15"] }, { required: ["b15"] }] },
					{ anyOf: [{ required: ["a16"] }, { required: ["b16"] }] },
					{ anyOf: [{ required: ["a17"] }, { required: ["b17"] }] },
					{ anyOf: [{ required: ["a18"] }, { required: ["b18"] }] },
					{ anyOf: [{ required: ["a19"] }, { required: ["b19"] }] },
					{ anyOf: [{ required: ["a20"] }, { required: ["b20"] }] },
					{ anyOf: [{ required: ["a21"] }, { required: ["b21"] }] },
					{ anyOf: [{ required: ["a22"] }, { required: ["b22"] }] },
					{ anyOf: [{ required: ["a23"] }, { required: ["b23"] }] },
					{ anyOf: [{ required: ["a24"] }, { required: ["b24"] }] },
					{ anyOf: [{ required: ["a25"] }, { required: ["b25"] }] },
					{ anyOf: [{ required: ["a26"] }, { required: ["b26"] }] },
					{ anyOf: [{ required: ["a27"] }, { required: ["b27"] }] },
					{ anyOf: [{ required: ["a28"] }, { required: ["b28"] }] },
					{ anyOf: [{ required: ["a29"] }, { required: ["b29"] }] }
				]
			})
		})

		it("$ref'd rules within the limit keep every combination", () => {
			const T = inferred({
				type: "object",
				allOf: [{ $ref: "#/$defs/r0" }, { $ref: "#/$defs/r1" }],
				$defs: {
					r0: {
						if: { properties: { k: { const: 0 } } },
						then: { required: ["v0"] },
						else: { properties: { v0: false } }
					},
					r1: {
						if: { properties: { k: { const: 1 } } },
						then: { required: ["v1"] },
						else: { properties: { v1: false } }
					}
				}
			})
			type rule<k extends string> = { [_ in k]: unknown } | { [_ in k]?: never }
			attest<rule<"v0"> & rule<"v1">, typeof T>()
			attest<typeof T, rule<"v0"> & rule<"v1">>()
		})

		it("allOf of twelve $ref'd if/then/else rules", () => {
			attest.instantiations([14200, "instantiations"])
			return inferred({
				type: "object",
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
				],
				$defs: {
					r0: {
						if: { properties: { k: { const: 0 } } },
						then: { required: ["v0"] },
						else: { properties: { v0: false } }
					},
					r1: {
						if: { properties: { k: { const: 1 } } },
						then: { required: ["v1"] },
						else: { properties: { v1: false } }
					},
					r2: {
						if: { properties: { k: { const: 2 } } },
						then: { required: ["v2"] },
						else: { properties: { v2: false } }
					},
					r3: {
						if: { properties: { k: { const: 3 } } },
						then: { required: ["v3"] },
						else: { properties: { v3: false } }
					},
					r4: {
						if: { properties: { k: { const: 4 } } },
						then: { required: ["v4"] },
						else: { properties: { v4: false } }
					},
					r5: {
						if: { properties: { k: { const: 5 } } },
						then: { required: ["v5"] },
						else: { properties: { v5: false } }
					},
					r6: {
						if: { properties: { k: { const: 6 } } },
						then: { required: ["v6"] },
						else: { properties: { v6: false } }
					},
					r7: {
						if: { properties: { k: { const: 7 } } },
						then: { required: ["v7"] },
						else: { properties: { v7: false } }
					},
					r8: {
						if: { properties: { k: { const: 8 } } },
						then: { required: ["v8"] },
						else: { properties: { v8: false } }
					},
					r9: {
						if: { properties: { k: { const: 9 } } },
						then: { required: ["v9"] },
						else: { properties: { v9: false } }
					},
					r10: {
						if: { properties: { k: { const: 10 } } },
						then: { required: ["v10"] },
						else: { properties: { v10: false } }
					},
					r11: {
						if: { properties: { k: { const: 11 } } },
						then: { required: ["v11"] },
						else: { properties: { v11: false } }
					}
				}
			})
		})

		it("allOf of four nested allOf groups of three rules", () => {
			attest.instantiations([12700, "instantiations"])
			return inferred({
				type: "object",
				allOf: [
					{
						allOf: [
							{
								if: { properties: { k: { const: 0 } } },
								then: { required: ["v0"] },
								else: { properties: { v0: false } }
							},
							{
								if: { properties: { k: { const: 1 } } },
								then: { required: ["v1"] },
								else: { properties: { v1: false } }
							},
							{
								if: { properties: { k: { const: 2 } } },
								then: { required: ["v2"] },
								else: { properties: { v2: false } }
							}
						]
					},
					{
						allOf: [
							{
								if: { properties: { k: { const: 3 } } },
								then: { required: ["v3"] },
								else: { properties: { v3: false } }
							},
							{
								if: { properties: { k: { const: 4 } } },
								then: { required: ["v4"] },
								else: { properties: { v4: false } }
							},
							{
								if: { properties: { k: { const: 5 } } },
								then: { required: ["v5"] },
								else: { properties: { v5: false } }
							}
						]
					},
					{
						allOf: [
							{
								if: { properties: { k: { const: 6 } } },
								then: { required: ["v6"] },
								else: { properties: { v6: false } }
							},
							{
								if: { properties: { k: { const: 7 } } },
								then: { required: ["v7"] },
								else: { properties: { v7: false } }
							},
							{
								if: { properties: { k: { const: 8 } } },
								then: { required: ["v8"] },
								else: { properties: { v8: false } }
							}
						]
					},
					{
						allOf: [
							{
								if: { properties: { k: { const: 9 } } },
								then: { required: ["v9"] },
								else: { properties: { v9: false } }
							},
							{
								if: { properties: { k: { const: 10 } } },
								then: { required: ["v10"] },
								else: { properties: { v10: false } }
							},
							{
								if: { properties: { k: { const: 11 } } },
								then: { required: ["v11"] },
								else: { properties: { v11: false } }
							}
						]
					}
				]
			})
		})

		it("a single-branch anyOf past the limit is dropped", () => {
			// limitation: a one-branch anyOf counts toward the union limit, so past three union branches it contributes nothing (sound, wider)
			const T = inferred({
				type: "object",
				allOf: [
					{ anyOf: [{ required: ["a"] }, { required: ["b"] }] },
					{ anyOf: [{ required: ["c"] }, { required: ["d"] }] },
					{ anyOf: [{ required: ["e"] }, { required: ["f"] }] },
					{
						anyOf: [
							{ properties: { id: { type: "string" } }, required: ["id"] }
						]
					}
				]
			})
			attest(T).type.toString.snap(`	| { a: unknown; c: unknown; e: unknown }
	| { a: unknown; c: unknown; f: unknown }
	| { a: unknown; d: unknown; e: unknown }
	| { a: unknown; d: unknown; f: unknown }
	| { b: unknown; c: unknown; e: unknown }
	| { b: unknown; c: unknown; f: unknown }
	| { b: unknown; d: unknown; e: unknown }
	| { b: unknown; d: unknown; f: unknown }`)
		})

		it("an if: true rule past the limit is dropped", () => {
			// limitation: an `if: true` rule counts toward the union limit, so past three union branches its then contributes nothing (sound, wider)
			const T = inferred({
				type: "object",
				allOf: [
					{ anyOf: [{ required: ["a"] }, { required: ["b"] }] },
					{ anyOf: [{ required: ["c"] }, { required: ["d"] }] },
					{ anyOf: [{ required: ["e"] }, { required: ["f"] }] },
					{
						if: true,
						then: { properties: { t: { type: "string" } }, required: ["t"] },
						else: false
					}
				]
			})
			attest(T).type.toString.snap(`	| { a: unknown; c: unknown; e: unknown }
	| { a: unknown; c: unknown; f: unknown }
	| { a: unknown; d: unknown; e: unknown }
	| { a: unknown; d: unknown; f: unknown }
	| { b: unknown; c: unknown; e: unknown }
	| { b: unknown; c: unknown; f: unknown }
	| { b: unknown; d: unknown; e: unknown }
	| { b: unknown; d: unknown; f: unknown }`)
		})

		it("allOf of three twenty-branch anyOfs", () => {
			// limitation: intersected unions build every member, 20^3 here (three fifty-branch anyOfs: a depth error)
			attest.instantiations([1180000, "instantiations"])
			return inferred({
				type: "object",
				allOf: [
					{
						anyOf: [
							{ properties: { g0: { const: 0 } }, required: ["g0"] },
							{ properties: { g0: { const: 1 } }, required: ["g0"] },
							{ properties: { g0: { const: 2 } }, required: ["g0"] },
							{ properties: { g0: { const: 3 } }, required: ["g0"] },
							{ properties: { g0: { const: 4 } }, required: ["g0"] },
							{ properties: { g0: { const: 5 } }, required: ["g0"] },
							{ properties: { g0: { const: 6 } }, required: ["g0"] },
							{ properties: { g0: { const: 7 } }, required: ["g0"] },
							{ properties: { g0: { const: 8 } }, required: ["g0"] },
							{ properties: { g0: { const: 9 } }, required: ["g0"] },
							{ properties: { g0: { const: 10 } }, required: ["g0"] },
							{ properties: { g0: { const: 11 } }, required: ["g0"] },
							{ properties: { g0: { const: 12 } }, required: ["g0"] },
							{ properties: { g0: { const: 13 } }, required: ["g0"] },
							{ properties: { g0: { const: 14 } }, required: ["g0"] },
							{ properties: { g0: { const: 15 } }, required: ["g0"] },
							{ properties: { g0: { const: 16 } }, required: ["g0"] },
							{ properties: { g0: { const: 17 } }, required: ["g0"] },
							{ properties: { g0: { const: 18 } }, required: ["g0"] },
							{ properties: { g0: { const: 19 } }, required: ["g0"] }
						]
					},
					{
						anyOf: [
							{ properties: { g1: { const: 0 } }, required: ["g1"] },
							{ properties: { g1: { const: 1 } }, required: ["g1"] },
							{ properties: { g1: { const: 2 } }, required: ["g1"] },
							{ properties: { g1: { const: 3 } }, required: ["g1"] },
							{ properties: { g1: { const: 4 } }, required: ["g1"] },
							{ properties: { g1: { const: 5 } }, required: ["g1"] },
							{ properties: { g1: { const: 6 } }, required: ["g1"] },
							{ properties: { g1: { const: 7 } }, required: ["g1"] },
							{ properties: { g1: { const: 8 } }, required: ["g1"] },
							{ properties: { g1: { const: 9 } }, required: ["g1"] },
							{ properties: { g1: { const: 10 } }, required: ["g1"] },
							{ properties: { g1: { const: 11 } }, required: ["g1"] },
							{ properties: { g1: { const: 12 } }, required: ["g1"] },
							{ properties: { g1: { const: 13 } }, required: ["g1"] },
							{ properties: { g1: { const: 14 } }, required: ["g1"] },
							{ properties: { g1: { const: 15 } }, required: ["g1"] },
							{ properties: { g1: { const: 16 } }, required: ["g1"] },
							{ properties: { g1: { const: 17 } }, required: ["g1"] },
							{ properties: { g1: { const: 18 } }, required: ["g1"] },
							{ properties: { g1: { const: 19 } }, required: ["g1"] }
						]
					},
					{
						anyOf: [
							{ properties: { g2: { const: 0 } }, required: ["g2"] },
							{ properties: { g2: { const: 1 } }, required: ["g2"] },
							{ properties: { g2: { const: 2 } }, required: ["g2"] },
							{ properties: { g2: { const: 3 } }, required: ["g2"] },
							{ properties: { g2: { const: 4 } }, required: ["g2"] },
							{ properties: { g2: { const: 5 } }, required: ["g2"] },
							{ properties: { g2: { const: 6 } }, required: ["g2"] },
							{ properties: { g2: { const: 7 } }, required: ["g2"] },
							{ properties: { g2: { const: 8 } }, required: ["g2"] },
							{ properties: { g2: { const: 9 } }, required: ["g2"] },
							{ properties: { g2: { const: 10 } }, required: ["g2"] },
							{ properties: { g2: { const: 11 } }, required: ["g2"] },
							{ properties: { g2: { const: 12 } }, required: ["g2"] },
							{ properties: { g2: { const: 13 } }, required: ["g2"] },
							{ properties: { g2: { const: 14 } }, required: ["g2"] },
							{ properties: { g2: { const: 15 } }, required: ["g2"] },
							{ properties: { g2: { const: 16 } }, required: ["g2"] },
							{ properties: { g2: { const: 17 } }, required: ["g2"] },
							{ properties: { g2: { const: 18 } }, required: ["g2"] },
							{ properties: { g2: { const: 19 } }, required: ["g2"] }
						]
					}
				]
			})
		})

		it("anyOf, oneOf and a conditional of ten branches each on one node", () => {
			// limitation: a node's own anyOf, oneOf and then/else multiply to 2000 members (fifty branches each: a depth error)
			attest.instantiations([314000, "instantiations"])
			return inferred({
				type: "object",
				anyOf: [
					{ properties: { g0: { const: 0 } }, required: ["g0"] },
					{ properties: { g0: { const: 1 } }, required: ["g0"] },
					{ properties: { g0: { const: 2 } }, required: ["g0"] },
					{ properties: { g0: { const: 3 } }, required: ["g0"] },
					{ properties: { g0: { const: 4 } }, required: ["g0"] },
					{ properties: { g0: { const: 5 } }, required: ["g0"] },
					{ properties: { g0: { const: 6 } }, required: ["g0"] },
					{ properties: { g0: { const: 7 } }, required: ["g0"] },
					{ properties: { g0: { const: 8 } }, required: ["g0"] },
					{ properties: { g0: { const: 9 } }, required: ["g0"] }
				],
				oneOf: [
					{ properties: { g1: { const: 0 } }, required: ["g1"] },
					{ properties: { g1: { const: 1 } }, required: ["g1"] },
					{ properties: { g1: { const: 2 } }, required: ["g1"] },
					{ properties: { g1: { const: 3 } }, required: ["g1"] },
					{ properties: { g1: { const: 4 } }, required: ["g1"] },
					{ properties: { g1: { const: 5 } }, required: ["g1"] },
					{ properties: { g1: { const: 6 } }, required: ["g1"] },
					{ properties: { g1: { const: 7 } }, required: ["g1"] },
					{ properties: { g1: { const: 8 } }, required: ["g1"] },
					{ properties: { g1: { const: 9 } }, required: ["g1"] }
				],
				if: { required: ["c"] },
				then: {
					anyOf: [
						{ properties: { g2: { const: 0 } }, required: ["g2"] },
						{ properties: { g2: { const: 1 } }, required: ["g2"] },
						{ properties: { g2: { const: 2 } }, required: ["g2"] },
						{ properties: { g2: { const: 3 } }, required: ["g2"] },
						{ properties: { g2: { const: 4 } }, required: ["g2"] },
						{ properties: { g2: { const: 5 } }, required: ["g2"] },
						{ properties: { g2: { const: 6 } }, required: ["g2"] },
						{ properties: { g2: { const: 7 } }, required: ["g2"] },
						{ properties: { g2: { const: 8 } }, required: ["g2"] },
						{ properties: { g2: { const: 9 } }, required: ["g2"] }
					]
				},
				else: {
					anyOf: [
						{ properties: { g2: { const: 0 } }, required: ["g2"] },
						{ properties: { g2: { const: 1 } }, required: ["g2"] },
						{ properties: { g2: { const: 2 } }, required: ["g2"] },
						{ properties: { g2: { const: 3 } }, required: ["g2"] },
						{ properties: { g2: { const: 4 } }, required: ["g2"] },
						{ properties: { g2: { const: 5 } }, required: ["g2"] },
						{ properties: { g2: { const: 6 } }, required: ["g2"] },
						{ properties: { g2: { const: 7 } }, required: ["g2"] },
						{ properties: { g2: { const: 8 } }, required: ["g2"] },
						{ properties: { g2: { const: 9 } }, required: ["g2"] }
					]
				}
			})
		})
	})

	describe("structured not and const over recursive compositions", () => {
		it("nested array exclusions around a root cycle", () => {
			const T = inferred({
				allOf: [
					{
						anyOf: [{ $ref: "#" }, { type: "string" }],
						not: { type: "array" }
					}
				],
				not: { type: "array" }
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("array exclusions over a cyclic pair of defs", () => {
			const T = inferred({
				$ref: "#/$defs/a",
				$defs: {
					a: { allOf: [{ $ref: "#/$defs/b" }], not: { type: "array" } },
					b: {
						anyOf: [{ $ref: "#/$defs/a" }, { type: "string" }],
						not: { type: "array" }
					}
				}
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("object exclusion over a recursive tree", () => {
			const T = inferred({
				type: ["object", "string"],
				properties: { children: { type: "array", items: { $ref: "#" } } },
				not: { type: "object" }
			})
			// a not that excludes structured values is skipped beside a ref
			attest(T).type.toString.snap(
				"string | { children?: (string | cyclic)[] }"
			)
		})

		it("array exclusion nested five deep over a recursive leaf", () => {
			attest.instantiations([3130, "instantiations"])
			// prettier-ignore
			return inferred({ type: "object", allOf: [{ type: "object", allOf: [{ type: "object", allOf: [{ type: "object", allOf: [{ type: "object", allOf: [{ type: "object", properties: { a: { type: "string" }, r: { $ref: "#" } }, required: ["a"] }], not: { type: "array" } }], not: { type: "array" } }], not: { type: "array" } }], not: { type: "array" } }], not: { type: "array" } })
		})

		it("$ref with a structured const nested twenty deep", () => {
			// prettier-ignore
			const T = inferred({ $defs: { o: { type: "object" } }, $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ type: "object", properties: { a: { type: "string" } }, required: ["a"] }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } })
			attest(T).type.toString.snap('{ readonly a: "x" }')
		})
	})
})

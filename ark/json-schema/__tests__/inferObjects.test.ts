import { attest, contextualize } from "@ark/attest"
import { type jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import { inferred } from "./utils.ts"

// a value of type t for display assertions on hand-written schema types
const of = <t>(): t => ({}) as never

contextualize(() => {
	describe("properties and required", () => {
		it("some required, in declaration order", () => {
			const T = jsonSchemaToType({
				type: "object",
				properties: {
					z: { type: "string" },
					y: { type: "number" },
					x: { type: "boolean" },
					w: { type: "null" },
					v: { type: "string" },
					u: { type: "number" }
				},
				required: ["u", "w", "y"]
			})
			attest(T.infer).type.toString.snap(`{
	z?: string
	y: number
	x?: boolean
	w: null
	v?: string
	u: number
}`)
		})

		it("empty", () => {
			attest(inferred({ type: "object", properties: {} })).type.toString.snap(
				"object"
			)
			attest(inferred({ type: "object", required: [] })).type.toString.snap(
				"object"
			)
		})

		it("required without properties", () => {
			const T = inferred({ type: "object", required: ["a", "b"] })
			attest(T).type.toString.snap("{ a: unknown; b: unknown }")
		})

		it("deeply readonly schema types infer mutable objects", () => {
			type T = jsonSchema.infer<{
				readonly type: "object"
				readonly properties: {
					readonly a: { readonly type: "string" }
					readonly b: { readonly type: "number" }
				}
				readonly required: readonly ["a"]
			}>
			attest(of<T>()).type.toString.snap("{ a: string; b?: number }")
		})

		it("numeric and string spellings of a key are one key", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{ properties: { 1: { type: "string" } } },
					{ properties: { "1": { type: "number" } } }
				]
			})
			attest(T).type.toString.snap("{ 1?: never }")
		})

		it("keywords without a type effect", () => {
			const T = inferred({
				title: "Person",
				type: "object",
				properties: {
					id: { type: "string", readOnly: true, default: 5 },
					name: { type: "string", writeOnly: true, deprecated: true }
				},
				required: ["id"],
				propertyNames: { enum: ["id", "name"] },
				dependentRequired: { id: ["other"] },
				dependentSchemas: { id: { required: ["name"] } },
				maxProperties: 0
			})
			attest(T).type.toString.snap("{ id: string; name?: string }")
		})
	})

	describe("hand-written schema types", () => {
		it("union of properties requiring a key one member declares", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties:
					| { a: { type: "string" }; b: { type: "number" } }
					| {
							c: { type: "null" }
					  }
				required: ["a"]
			}>
			attest(of<T>()).type.toString.snap(`	| { a: string; b?: number }
	| { c?: null; a: unknown }`)
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
			const T = of<jsonSchema.infer<Tree>>()
			attest<number>(T.value)
			attest<number | undefined>(T.children?.[0]?.value)
		})

		it("properties that may be undefined", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } } | undefined
			}>
			attest(of<{ a: 1 } extends T ? true : false>()).type.toString.snap("true")
			attest(of<T>()).type.toString.snap("object")
		})
	})

	describe("required tuples", () => {
		it("entries that aren't literal keys require nothing", () => {
			type properties = { a: { type: "string" }; b: { type: "number" } }
			type withRequired<required> = jsonSchema.infer<{
				type: "object"
				properties: properties
				required: required
			}>
			attest<{ a?: string; b?: number }, withRequired<string[]>>()
			attest<{ a?: string; b?: number }, withRequired<[any]>>()
			attest<{ a?: string; b?: number }, withRequired<[never]>>()
			attest<{ a: string; b?: number }, withRequired<["a", string]>>()
			attest<{ a?: string; b?: number }, withRequired<["a"] | string[]>>()
			attest<{ a?: string; b?: number }, withRequired<["a", "b"?]>>()
			// limitation: required entries that aren't literal keys require nothing, and without properties the result is {} rather than object (sound: {} accepts every object)
			attest(
				of<jsonSchema.infer<{ type: "object"; required: [string] }>>()
			).type.toString.snap("{}")
		})

		it("union of required tuples", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" }; b: { type: "number" } }
				required: ["a"] | ["b"]
			}>
			attest(of<T>()).type.toString.snap(`	| { a: string; b?: number }
	| { a?: string; b: number }`)
		})

		it("union entry", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" }; b: { type: "number" } }
				required: ["a" | "b"]
			}>
			attest(of<T>()).type.toString.snap(`	| { a: string; b?: number }
	| { a?: string; b: number }`)
		})

		it("rest element between fixed elements", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: {
					a: { type: "string" }
					b: { type: "number" }
					c: { type: "null" }
				}
				required: ["c", ..."a"[], "b"]
			}>
			attest(of<T>()).type.toString.snap("{ a?: string; b: number; c: null }")
		})
	})

	describe("properties typed as a record", () => {
		it("open and closed", () => {
			type T<additional> = jsonSchema.infer<{
				type: "object"
				properties: Record<string, { type: "string" }>
				additionalProperties: additional
			}>
			attest(of<T<true>>()).type.toString.snap("{ [x: string]: unknown }")
			attest(of<T<false>>()).type.toString.snap("{ [x: string]: string }")
		})

		it("open record with a required key and additionalProperties", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: Record<string, { type: "string" }>
				required: ["a"]
				additionalProperties: { type: "number" }
			}>
			attest(of<T>()).type.toString.snap(`{
	[x: string]: string | number
	a: string | number
}`)
		})
	})

	describe("additionalProperties", () => {
		it("boolean", () => {
			attest(
				inferred({ type: "object", additionalProperties: true })
			).type.toString.snap("object")
			attest(
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					required: ["a"],
					additionalProperties: false
				})
			).type.toString.snap("{ a: string }")
		})

		it("declared property incompatible with additional", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				additionalProperties: { type: "number" }
			})
			attest(T).type.toString.snap(
				"{ [x: string]: string | number; a: string }"
			)
		})

		it("required without properties", () => {
			attest(
				inferred({
					type: "object",
					required: ["a"],
					additionalProperties: { type: "number" }
				})
			).type.toString.snap("{ [x: string]: number; a: number }")
			attest(
				inferred({
					type: "object",
					required: ["a"],
					additionalProperties: false
				})
			).type.toString.snap("{ a: unknown }")
		})

		it("hand-written values", () => {
			type T<additional> = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } }
				additionalProperties: additional
			}>
			attest(of<T<any>>()).type.toString.snap(
				"{ [x: string]: any; a?: string }"
			)
			attest<{ a?: string }, T<{ type: "number" } | false>>()
		})
	})

	describe("patternProperties", () => {
		it("single", () => {
			attest(
				inferred({
					type: "object",
					patternProperties: { "^x-": { type: "string" } }
				})
			).type.toString.snap("{ [x: string]: unknown }")
		})

		it("multiple", () => {
			const T = inferred({
				type: "object",
				patternProperties: {
					"^s_": { type: "string" },
					"^n_": { type: "number" },
					"^b_": { type: "boolean" }
				},
				additionalProperties: false
			})
			attest(T).type.toString.snap("{ [x: string]: string | number | boolean }")
		})

		it("false patterns", () => {
			attest(
				inferred({ type: "object", patternProperties: {} })
			).type.toString.snap("object")
			attest(
				inferred({ type: "object", patternProperties: { "^x-": false } })
			).type.toString.snap("object")
			attest(
				inferred({
					type: "object",
					patternProperties: { "^x-": false, "^n_": { type: "number" } },
					additionalProperties: false
				})
			).type.toString.snap("{ [x: string]: number }")
		})

		it("required key without property schema and additionalProperties schema", () => {
			const T = inferred({
				type: "object",
				patternProperties: { "^x-": { type: "string" } },
				additionalProperties: { type: "number" },
				required: ["x-id"]
			})
			attest(T).type.toString.snap(`{
	[x: string]: string | number
	"x-id": string | number
}`)
		})
	})

	describe("implied objects", () => {
		it("properties", () => {
			const T = inferred({
				properties: { a: { type: "string" } },
				required: ["a"]
			})
			attest(T).type.toString.snap(`	| string
	| number
	| boolean
	| unknown[]
	| { a: string }
	| null`)
		})

		it("with array keywords", () => {
			const T = inferred({
				properties: { a: { type: "string" } },
				items: { type: "number" }
			})
			attest(T).type.toString.snap(`	| string
	| number
	| boolean
	| number[]
	| { a?: string }
	| null`)
		})
	})

	describe("const and enum against properties", () => {
		it("a widened value", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { enum: ["b", "c"] } }
				const: { a: string }
			}>
			attest({} as T).type.toString.snap('{ a: "b" | "c" }')
		})
	})

	describe("allOf merges", () => {
		it("optional and required of the same key", () => {
			const T = inferred({
				allOf: [
					{ type: "object", properties: { a: { type: "string" } } },
					{
						type: "object",
						properties: { a: { type: "string", minLength: 1 } },
						required: ["a"]
					}
				]
			})
			attest(T).type.toString.snap("{ a: string }")
		})

		it("an index constrains a base required key", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				allOf: [{ additionalProperties: { type: "number" } }]
			})
			attest(T).type.toString.snap("{ [x: string]: number; a: never }")
		})

		it("an index merged with an optional key rejects undefined", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{ additionalProperties: { type: ["string", "number", "boolean"] } },
					{
						properties: { a: { type: "string" }, b: { type: "number" } },
						required: ["a"]
					}
				]
			})
			// @ts-expect-error
			const bad: typeof T = { a: "x", b: undefined }
			attest(bad)
			attest<{ [k: string]: string | number | boolean; a: string; b?: number }>(
				T
			)
		})

		it("merged objects are mutable", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				additionalProperties: { type: "string" },
				allOf: [{ properties: { b: { type: "string" } } }]
			})
			const value: typeof T = { a: "x" }
			value.a = "y"
			value.b = "z"
			value.other = "w"
			attest<{ [k: string]: string; a: string; b?: string }>(T)
		})
	})

	describe("recursive merges", () => {
		it("mutually recursive allOf accepts and rejects data", () => {
			const T = inferred({
				$defs: {
					A: {
						allOf: [
							{ $ref: "#/$defs/B" },
							{ properties: { a: { $ref: "#/$defs/A" } } }
						]
					},
					B: {
						type: "object",
						properties: { b: { $ref: "#/$defs/A" } },
						additionalProperties: { $ref: "#/$defs/B" }
					}
				},
				$ref: "#/$defs/A"
			})
			const ok: typeof T = { a: { b: {} }, b: {}, c: { b: {} } }
			// @ts-expect-error
			const bad: typeof T = { a: 1 }
			attest([ok, bad])
			// limitation: merging a recursive allOf branch into an index that includes it displays internal mapped types (shapeOf/intersectValues); the type itself is correct
			attest(T).type.toString(/shapeOf<.*intersectValues</s)
		})

		it("an allOf branch indexed by the node keeps its index", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{ additionalProperties: { $ref: "#" } },
					{ properties: { a: true } }
				]
			})
			const ok: typeof T = { x: {}, a: { y: {} } }
			// @ts-expect-error
			const bad: typeof T = { x: 1 }
			attest([ok, bad])
			attest(T).type.toString.snap("{ [x: string]: cyclic; a?: cyclic }")
		})
	})
})

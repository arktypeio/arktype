import { attest, contextualize } from "@ark/attest"
import { jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import type { JsonSchema } from "arktype"

// checks inference for schemas the runtime parser doesn't support ($ref, {}, type-less)
// like jsonSchemaToType, the result is read back with `infer` so attest's
// contextual type isn't inferred into jsonSchema.infer
const inferred = <const schema, r = jsonSchema.infer<schema>>(
	schema: jsonSchema.validate<schema>
): r extends infer _ ? _ : never => schema as never

// a value of type t for display assertions on hand-written schema types
const of = <t>(): t => ({}) as never

contextualize(() => {
	describe("properties and required", () => {
		it("all required", () => {
			const T = jsonSchemaToType({
				type: "object",
				properties: { a: { type: "string" }, b: { type: "number" } },
				required: ["a", "b"]
			})
			attest<{ a: string; b: number }>(T.infer).type.toString.snap(
				"{ a: string; b: number }"
			)
		})

		it("none required", () => {
			const T = jsonSchemaToType({
				type: "object",
				properties: { a: { type: "string" }, b: { type: "number" } }
			})
			attest<{ a?: string; b?: number }>(T.infer).type.toString.snap(
				"{ a?: string; b?: number }"
			)
		})

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
			attest<{
				z?: string
				y: number
				x?: boolean
				w: null
				v?: string
				u: number
			}>(T.infer).type.toString.snap(`{
	z?: string
	y: number
	x?: boolean
	w: null
	v?: string
	u: number
}`)
		})

		it("duplicate required infers once", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" }, b: { type: "number" } },
				required: ["a", "a"]
			})
			attest<{ a: string; b?: number }>(T).type.toString.snap(
				"{ a: string; b?: number }"
			)
		})

		it("empty properties", () => {
			const T = jsonSchemaToType({ type: "object", properties: {} })
			attest<object>(T.infer).type.toString.snap("object")
		})

		it("empty required without properties", () => {
			const T = inferred({ type: "object", required: [] })
			attest<object>(T).type.toString.snap("object")
		})

		it("required without properties", () => {
			const T = inferred({ type: "object", required: ["a", "b"] })
			attest<{ a: unknown; b: unknown }>(T).type.toString.snap(
				"{ a: unknown; b: unknown }"
			)
		})

		it("optional boolean properties", () => {
			const T = inferred({
				type: "object",
				properties: { a: true, b: false }
			})
			attest<{ a?: unknown; b?: never }>(T).type.toString.snap(
				"{ a?: unknown; b?: never }"
			)
		})

		it("required applies only at its own level", () => {
			const T = inferred({
				type: "object",
				properties: {
					a: {
						type: "object",
						properties: { a: { type: "object", properties: { a: true } } },
						required: ["a"]
					}
				},
				required: ["a"]
			})
			attest<{ a: { a: { a?: unknown } } }>(T).type.toString.snap(
				"{ a: { a: { a?: unknown } } }"
			)
		})

		it("properties split across allOf", () => {
			const T = inferred({
				allOf: [
					{ type: "object", properties: { a: { type: "string" } } },
					{ type: "object", properties: { b: { type: "number" } } }
				],
				required: ["a", "b"]
			})
			attest<{ a: string; b: number }>(T).type.toString.snap(
				"{ a: string; b: number }"
			)
		})
	})

	describe("hand-written schema types", () => {
		it("mutable", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" }; b: { type: "number" } }
				required: ["b"]
			}>
			attest<{ a?: string; b: number }, T>()
			attest(of<T>()).type.toString.snap("{ a?: string; b: number }")
		})

		it("deeply readonly", () => {
			type T = jsonSchema.infer<{
				readonly type: "object"
				readonly properties: {
					readonly a: { readonly type: "string" }
					readonly b: { readonly type: "number" }
				}
				readonly required: readonly ["a"]
			}>
			attest<{ a: string; b?: number }, T>()
			attest(of<T>()).type.toString.snap("{ a: string; b?: number }")
		})

		it("union of schemas", () => {
			type T = jsonSchema.infer<
				| {
						type: "object"
						properties: { a: { type: "string" } }
						required: ["a"]
				  }
				| { type: "string" }
			>
			attest<{ a: string } | string, T>()
			attest(of<T>()).type.toString.snap("string | { a: string }")
		})

		it("union of property schemas", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } | { type: "number" } }
				required: ["a"]
			}>
			attest<{ a: string | number }, T>()
			attest(of<T>()).type.toString.snap("{ a: string | number }")
		})

		it("union of properties without required keys", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties:
					| { a: { type: "string" }; b: { type: "number" } }
					| { a: { type: "boolean" } }
			}>
			attest<{ a?: string; b?: number } | { a?: boolean }, T>()
		})

		it("union of properties requiring a key every member declares", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties:
					| { a: { type: "string" }; b: { type: "number" } }
					| { a: { type: "boolean" } }
				required: ["a"]
			}>
			attest<{ a: string; b?: number } | { a: boolean }>(
				of<T>()
			).type.toString.snap("{ a: string; b?: number } | { a: boolean }")
		})

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
			attest<{ a: string; b?: number } | { c?: null; a: unknown }>(of<T>()).type
				.toString.snap(`	| { a: string; b?: number }
	| { c?: null; a: unknown }`)
		})

		it("union of properties with additionalProperties", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } } | { b: { type: "number" } }
				additionalProperties: { type: "boolean" }
			}>
			attest<
				| { [k: string]: string | boolean; a?: string }
				| { [k: string]: number | boolean; b?: number }
			>(of<T>()).type.toString
				.snap(`	| { [x: string]: string | boolean; a?: string }
	| { [x: string]: number | boolean; b?: number }`)
		})

		it("union of patternProperties", () => {
			type T = jsonSchema.infer<{
				type: "object"
				patternProperties:
					| { "^s": { type: "string" } }
					| { "^n": { type: "number" } }
				additionalProperties: false
			}>
			attest<{ [k: string]: string | number }>(of<T>()).type.toString.snap(
				"{ [x: string]: string | number }"
			)
		})
	})

	describe("required tuples", () => {
		it("widened array requires nothing", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" }; b: { type: "number" } }
				required: string[]
			}>
			attest(of<T>()).type.toString.snap("{ a?: string; b?: number }")
		})

		it("array of a key union requires nothing", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" }; b: { type: "number" } }
				required: ("a" | "b")[]
			}>
			attest<{ a?: string; b?: number }>(of<T>()).type.toString.snap(
				"{ a?: string; b?: number }"
			)
		})

		it("required that may be undefined requires nothing", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } }
				required: ["a"] | undefined
			}>
			attest<{ a?: string }>(of<T>()).type.toString.snap("{ a?: string }")
		})

		it("any requires nothing", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } }
				required: any
			}>
			attest<{ a?: string }>(of<T>()).type.toString.snap("{ a?: string }")
		})

		it("required entries that are any, never or string require nothing", () => {
			type A = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } }
				required: [any]
			}>
			type N = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } }
				required: [never]
			}>
			type S = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } }
				required: [string]
			}>
			attest<{ a?: string }, A>()
			attest<{ a?: string }, N>()
			attest<{ a?: string }, S>()
		})

		it("widened entry beside a literal key", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" }; b: { type: "number" } }
				required: ["a", string]
			}>
			attest<{ a: string; b?: number }>(of<T>()).type.toString.snap(
				"{ a: string; b?: number }"
			)
		})

		// limitation: required entries that aren't literal keys require nothing, and without properties the result is {} rather than object (sound: {} accepts every object)
		it("widened required entry without properties", () => {
			type T = jsonSchema.infer<{ type: "object"; required: [string] }>
			attest(of<T>()).type.toString.snap("{}")
		})

		it("union of required tuples", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" }; b: { type: "number" } }
				required: ["a"] | ["b"]
			}>
			attest<{ a: string; b?: number } | { a?: string; b: number }>(of<T>())
				.type.toString.snap(`	| { a: string; b?: number }
	| { a?: string; b: number }`)
		})

		it("union of a required tuple and a widened array", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" }; b: { type: "number" } }
				required: ["a"] | string[]
			}>
			attest<{ a?: string; b?: number }, T>()
		})

		it("union of required tuples with additionalProperties", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } }
				required: ["a", "c"] | ["a"]
				additionalProperties: { type: "boolean" }
			}>
			attest<
				| { [k: string]: string | boolean; a: string; c: boolean }
				| { [k: string]: string | boolean; a: string }
			>(of<T>()).type.toString
				.snap(`	| { [x: string]: string | boolean; a: string }
	| { [x: string]: string | boolean; a: string; c: boolean }`)
		})

		it("union entry", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" }; b: { type: "number" } }
				required: ["a" | "b"]
			}>
			attest<{ a: string; b?: number } | { a?: string; b: number }>(of<T>())
				.type.toString.snap(`	| { a: string; b?: number }
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
			attest<{ a?: string; b: number; c: null }>(of<T>()).type.toString.snap(
				"{ a?: string; b: number; c: null }"
			)
		})

		it("leading rest element", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } }
				required: [..."b"[], "a"]
			}>
			attest<{ a: string }>(of<T>()).type.toString.snap("{ a: string }")
		})

		it("optional tuple element requires nothing", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" }; b: { type: "number" } }
				required: ["a", "b"?]
			}>
			attest<{ a?: string; b?: number }>(of<T>()).type.toString.snap(
				"{ a?: string; b?: number }"
			)
		})
	})

	describe("properties typed as a record", () => {
		it("open record", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: Record<string, { type: "string" }>
			}>
			attest<{ [k: string]: unknown }>(of<T>()).type.toString.snap(
				"{ [x: string]: unknown }"
			)
		})

		it("open record with a required key and additionalProperties", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: Record<string, { type: "string" }>
				required: ["a"]
				additionalProperties: { type: "number" }
			}>
			attest<{ [k: string]: string | number; a: string | number }>(of<T>()).type
				.toString.snap(`{
	[x: string]: string | number
	a: string | number
}`)
		})

		it("closed record", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: Record<string, { type: "string" }>
				additionalProperties: false
			}>
			attest<{ [k: string]: string }>(of<T>()).type.toString.snap(
				"{ [x: string]: string }"
			)
		})

		it("template literal index beside a declared key", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: {
					[k: `x-${string}`]: { type: "string" }
					id: { type: "number" }
				}
				required: ["id"]
			}>
			attest<{ [k: string]: unknown; id: number }>(of<T>()).type.toString.snap(
				"{ [x: string]: unknown; id: number }"
			)
		})

		it("template required entry matching a declared key", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { "x-a": { type: "string" } }
				required: [`x-${string}`]
				additionalProperties: { type: "number" }
			}>
			// required: ["x-a"] is a value of the required type, which accepts { "x-a": "s" }
			attest(
				of<{ "x-a": string } extends T ? true : false>()
			).type.toString.snap("true")
			attest<{ [k: string]: string | number; "x-a"?: string }>(
				of<T>()
			).type.toString.snap('{ [x: string]: string | number; "x-a"?: string }')
		})

		it("intersection of a record and a literal key", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "number" } } & Record<
					string,
					{ type: "string" }
				>
				required: ["a", string]
			}>
			attest<{ [k: string]: unknown; a: number }>(of<T>()).type.toString.snap(
				"{ [x: string]: unknown; a: number }"
			)
		})

		// a value of this properties type needs `id` to be both { type: "string" } and
		// { type: "number" }, so it has no values and the result is vacuously sound
		it("closed record with a conflicting literal key", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: Record<string, { type: "string" }> & {
					id: { type: "number" }
				}
				additionalProperties: false
			}>
			attest<{ [k: string]: string } & { id?: number }, T>()
		})

		it("record of a literal key and a template", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: Record<"a" | `x-${string}`, { type: "string" }>
				required: ["a", "x-b"]
				additionalProperties: { type: "boolean" }
			}>
			attest<
				{ [k: string]: string | boolean; a: string; "x-b": string | boolean },
				T
			>()
		})

		it("numeric record closed", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: Record<number, { type: "string" }>
				required: ["1"]
				additionalProperties: false
			}>
			attest<{ [k: string]: string; 1: string }, T>()
		})
	})

	describe("widened object keywords", () => {
		it("widened type", () => {
			const type: string = "object"
			attest<unknown>(inferred({ type, properties: { a: { type: "string" } } }))
		})

		it("non-const nested object", () => {
			const properties = { a: { type: "string" } }
			const T = inferred({ type: "object", properties })
			attest<{ a?: unknown }>(T).type.toString.snap("{ a?: unknown }")
		})

		it("JsonSchema.Object", () => {
			const schema: JsonSchema.Object = { type: "object" }
			attest(inferred(schema)).type.toString.snap("object")
			attest(() => inferred(schema)).type.errors.is("")
		})

		it("widened property schema", () => {
			const a: JsonSchema = { type: "string" }
			const T = inferred({
				type: "object",
				properties: { a, b: { type: "number" } },
				required: ["a", "b"]
			})
			attest<{ a: unknown; b: number }>(T).type.toString.snap(
				"{ a: unknown; b: number }"
			)
		})

		it("properties that may be undefined", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } } | undefined
			}>
			attest(of<{ a: 1 } extends T ? true : false>()).type.toString.snap("true")
			attest(of<T>()).type.toString.snap("object")
		})

		it("unknown properties beside additionalProperties", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: unknown
				additionalProperties: { type: "number" }
			}>
			attest(of<{ a: "x" } extends T ? true : false>()).type.toString.snap(
				"true"
			)
		})

		// limitation: `properties: object` is read as empty, since TS can't tell object from {} (so { a: "x" } is rejected though object may declare a)
		it("object properties beside additionalProperties", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: object
				additionalProperties: { type: "number" }
			}>
			attest(of<{ a: "x" } extends T ? true : false>()).type.toString.snap(
				"false"
			)
		})

		it("additionalProperties widened to JsonSchema", () => {
			const additionalProperties: JsonSchema = { type: "string" }
			const T = inferred({ type: "object", additionalProperties })
			attest<{ [k: string]: unknown }>(T).type.toString.snap(
				"{ [x: string]: unknown }"
			)
		})

		it("additionalProperties any is an any index", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } }
				additionalProperties: any
			}>
			attest(of<T>()).type.toString.snap("{ [x: string]: any; a?: string }")
		})

		it("additionalProperties schema or false adds no index", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } }
				additionalProperties: { type: "number" } | false
			}>
			attest<{ a?: string }, T>()
		})

		it("patternProperties any adds no index", () => {
			type T = jsonSchema.infer<{ type: "object"; patternProperties: any }>
			attest<object>(of<T>()).type.toString.snap("object")
		})

		it("patternProperties any beside additionalProperties is an any index", () => {
			type T = jsonSchema.infer<{
				type: "object"
				patternProperties: any
				additionalProperties: { type: "string" }
			}>
			attest<{ [k: string]: any }>(of<T>()).type.toString.snap(
				"{ [x: string]: any }"
			)
		})

		it("unknown patternProperties", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "string" } }
				patternProperties: unknown
			}>
			attest<{ [k: string]: unknown; a?: string }, T>()
		})

		// limitation: a widened patternProperties (object or unknown) is read as empty, so closed it gives a never index though it may match any key
		it("object patternProperties closed by additionalProperties", () => {
			type T = jsonSchema.infer<{
				type: "object"
				patternProperties: object
				additionalProperties: false
			}>
			attest(of<{ x: "s" } extends T ? true : false>()).type.toString.snap(
				"false"
			)
		})
	})

	describe("property keys", () => {
		it("empty string key", () => {
			const T = inferred({
				type: "object",
				properties: { "": { type: "string" }, a: { type: "number" } },
				required: [""]
			})
			attest<{ "": string; a?: number }>(T).type.toString.snap(
				'{ "": string; a?: number }'
			)
		})

		it("NUL key", () => {
			const T = inferred({
				type: "object",
				properties: { "\u0000": { type: "string" }, b: { type: "number" } },
				required: ["b"]
			})
			attest<{ "\u0000"?: string; b: number }>(T).type.toString.snap(
				'{ "\\0"?: string; b: number }'
			)
		})

		it("__proto__ and prototype members as declared keys", () => {
			const T = inferred({
				type: "object",
				properties: {
					["__proto__"]: { type: "string" },
					constructor: { type: "string" },
					toString: { type: "number" }
				},
				required: ["__proto__", "constructor"]
			})
			attest<{ __proto__: string; constructor: string; toString?: number }>(
				T
			).type.toString.snap(
				`{
	__proto__: string
	constructor: string
	toString?: number
}`
			)
		})

		it("non-computed __proto__", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "number" }, __proto__: { type: "string" } },
				required: ["a"]
			})
			attest(T).type.toString.snap("{ a: number; __proto__?: string }")
		})

		it("prototype member names outside properties", () => {
			const T = inferred({
				type: "object",
				required: ["__proto__", "constructor"],
				additionalProperties: { type: "number" }
			})
			attest<{ [k: string]: number; __proto__: number; constructor: number }>(T)
			const value: typeof T = { constructor: 1, ["__proto__"]: 2, other: 3 }
			attest(value.constructor).type.toString.snap("number")
		})

		it("keyword-like keys", () => {
			const T = inferred({
				type: "object",
				properties: {
					type: { type: "string" },
					properties: { type: "number" },
					$ref: { type: "boolean" },
					required: { type: "array", items: { type: "string" } },
					items: { type: "null" },
					const: { type: "string" },
					enum: { type: "string" },
					not: { type: "string" },
					nullable: { type: "boolean" },
					additionalProperties: { type: "string" },
					allOf: { type: "number" }
				},
				required: ["type", "$ref", "required"]
			})
			attest<{
				type: string
				properties?: number
				$ref: boolean
				required: string[]
				items?: null
				const?: string
				enum?: string
				not?: string
				nullable?: boolean
				additionalProperties?: string
				allOf?: number
			}>(T).type.toString.snap(`{
	type: string
	properties?: number
	$ref: boolean
	required: string[]
	items?: null
	const?: string
	enum?: string
	not?: string
	nullable?: boolean
	additionalProperties?: string
	allOf?: number
}`)
		})

		it("keyword-like keys with keyword-like property schemas", () => {
			const T = inferred({
				type: "object",
				properties: {
					$ref: { $ref: "#/$defs/ref" },
					$defs: { type: "object" }
				},
				$defs: { ref: { type: "string" } },
				required: ["$ref"]
			})
			attest<{ $ref: string; $defs?: object }>(T).type.toString.snap(
				"{ $ref: string; $defs?: object }"
			)
		})

		it("required keys with quotes, slashes and tildes", () => {
			const T = inferred({
				type: "object",
				properties: {
					'a"b': { type: "string" },
					"a/b": { type: "number" },
					"a~b": { type: "boolean" },
					"a\\u0041": { type: "null" }
				},
				required: ['a"b', "a/b", "a~b", "a\\u0041"]
			})
			attest<{
				'a"b': string
				"a/b": number
				"a~b": boolean
				"a\\u0041": null
			}>(T).type.toString.snap(`{
	'a"b': string
	"a/b": number
	"a~b": boolean
	"a\\\\u0041": null
}`)
		})

		it("refs into properties by escaped names", () => {
			const T = inferred({
				type: "object",
				properties: {
					"a/b": { type: "string" },
					"a~b": { type: "number" },
					"": { type: "null" },
					c: { $ref: "#/properties/a~1b" },
					d: { $ref: "#/properties/a~0b" },
					f: { $ref: "#/properties/" }
				},
				required: ["c", "d", "f"]
			})
			attest<{
				"a/b"?: string
				"a~b"?: number
				""?: null
				c: string
				d: number
				f: null
			}>(T)
		})
	})

	describe("numeric keys", () => {
		it("numeric-like strings stay strings", () => {
			const T = inferred({
				type: "object",
				properties: {
					"01": { type: "string" },
					"1.5": { type: "number" },
					"-1": { type: "boolean" },
					"1e3": { type: "null" }
				},
				required: ["01", "-1"]
			})
			attest<{
				"01": string
				"1.5"?: number
				"-1": boolean
				"1e3"?: null
			}>(T).type.toString.snap(`{
	"01": string
	"1.5"?: number
	"-1": boolean
	"1e3"?: null
}`)
		})

		it("numeric-like keys keep their JSON spelling", () => {
			const T = inferred({
				type: "object",
				properties: {
					1.5: { type: "string" },
					0x10: { type: "number" },
					"-1": { type: "null" }
				},
				required: ["1.5", "16", "-1"]
			})
			attest<{ 1.5: string; 16: number; "-1": null }>(T).type.toString.snap(
				'{ 1.5: string; 16: number; "-1": null }'
			)
			const value: typeof T = { "1.5": "x", "16": 1, "-1": null }
			attest(value["16"]).type.toString.snap("number")
		})

		it("numeric property key with additionalProperties", () => {
			const T = inferred({
				type: "object",
				properties: { 1: { type: "string" } },
				required: ["1"],
				additionalProperties: { type: "number" }
			})
			attest<{ [k: string]: string | number; 1: string }>(T).type.toString.snap(
				"{ [x: string]: string | number; 1: string }"
			)
		})

		it("numeric key required in an allOf branch", () => {
			const T = inferred({
				type: "object",
				properties: { 1: { type: "string" } },
				allOf: [{ required: ["1"] }]
			})
			attest<{ 1: string }>(T).type.toString.snap("{ 1: string }")
		})

		it("numeric key with an allOf index", () => {
			const T = inferred({
				type: "object",
				properties: { 1: { type: "string" } },
				allOf: [{ additionalProperties: { type: "number" } }]
			})
			attest<{ [k: string]: number; 1?: never }>(T).type.toString.snap(
				"{ [x: string]: number; 1?: never }"
			)
		})

		it("numeric and string spellings of a key are one key", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{ properties: { 1: { type: "string" } } },
					{ properties: { "1": { type: "number" } } }
				]
			})
			attest<{ 1?: never }>(T).type.toString.snap("{ 1?: never }")
		})

		it("optional keys of numeric spellings stay exact", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{ properties: { 1: { type: "string" }, b: { type: "null" } } },
					{ properties: { "1": { type: "string" }, c: { type: "boolean" } } }
				]
			})
			attest<{ 1?: string; b?: null; c?: boolean }>(T).type.toString.snap(
				"{ 1?: string; b?: null; c?: boolean }"
			)
			const value: typeof T = { 1: "x" }
			// @ts-expect-error
			const withUndefined: typeof T = { c: undefined }
			attest([value, withUndefined])
		})

		it("required completes numeric property keys", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { 10: true, 11: true, a: true },
					// @ts-expect-error
					required: ["1"]
				})
			).completions({ "1": ["10", "11"] })
		})

		it("misspelled numeric required key", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { 10: true, 11: true },
					// @ts-expect-error
					required: ["12"]
				})
			).type.errors(`Type '"12"' is not assignable to type '"10" | "11"'`)
		})
	})

	describe("property schemas", () => {
		it("every primitive type", () => {
			const T = jsonSchemaToType({
				type: "object",
				properties: {
					s: { type: "string" },
					n: { type: "number" },
					i: { type: "integer" },
					b: { type: "boolean" },
					z: { type: "null" },
					o: { type: "object" },
					a: { type: "array" }
				},
				required: ["s", "n", "i", "b", "z", "o", "a"]
			})
			attest<{
				s: string
				n: number
				i: number
				b: boolean
				z: null
				o: object
				a: unknown[]
			}>(T.infer).type.toString.snap(`{
	s: string
	n: number
	i: number
	b: boolean
	z: null
	o: object
	a: unknown[]
}`)
		})

		it("$ref property", () => {
			const T = inferred({
				$defs: {
					address: {
						type: "object",
						properties: { street: { type: "string" } },
						required: ["street"]
					}
				},
				type: "object",
				properties: {
					home: { $ref: "#/$defs/address" },
					work: { $ref: "#/$defs/address" }
				},
				required: ["home"]
			})
			attest<{ home: { street: string }; work?: { street: string } }>(T).type
				.toString.snap(`{
	home: { street: string }
	work?: { street: string }
}`)
		})

		it("linked list through root", () => {
			type List = { value: number; next: List | null }
			const T = inferred({
				type: "object",
				properties: {
					value: { type: "number" },
					next: { anyOf: [{ $ref: "#" }, { type: "null" }] }
				},
				required: ["value", "next"]
			})
			attest<List>(T)
			attest<List | null>(T.next)
		})

		it("refs into patternProperties and additionalProperties", () => {
			const T = inferred({
				type: "object",
				patternProperties: { "^x": { type: "number" } },
				properties: {
					c: { $ref: "#/patternProperties/^x" },
					d: { $ref: "#/additionalProperties" }
				},
				additionalProperties: { type: "boolean" },
				required: ["c", "d"]
			})
			attest<{
				[k: string]: number | boolean
				c: number
				d: boolean
			}>(T).type.toString.snap(`{
	[x: string]: number | boolean
	c: number
	d: boolean
}`)
		})

		it("$ref siblings merge after the base properties", () => {
			const T = inferred({
				$defs: {
					s: { type: "object", properties: { x: { type: "string" } } }
				},
				type: "object",
				properties: {
					a: {
						$ref: "#/$defs/s",
						properties: { y: { type: "number" } },
						required: ["x", "y"]
					}
				}
			})
			attest<{ a?: { y: number; x: string } }>(T).type.toString.snap(
				"{ a?: { y: number; x: string } }"
			)
		})

		it("draft-07 ignores a property's $ref siblings", () => {
			const T = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "object",
				definitions: { s: { type: "string" } },
				properties: { a: { $ref: "#/definitions/s", type: "number" } },
				required: ["a"]
			})
			attest<{ a: string }>(T).type.toString.snap("{ a: string }")
		})
	})

	describe("keywords without a type effect", () => {
		it("readOnly and writeOnly don't add modifiers", () => {
			const T = inferred({
				type: "object",
				properties: {
					id: { type: "string", readOnly: true },
					password: { type: "string", writeOnly: true }
				},
				required: ["id"]
			})
			attest<{ id: string; password?: string }>(T).type.toString.snap(
				"{ id: string; password?: string }"
			)
		})

		it("default doesn't make a property required", () => {
			const T = inferred({
				type: "object",
				properties: {
					a: { type: "string", default: "foo" },
					b: { type: "number", default: 0 }
				},
				required: ["b"]
			})
			attest<{ a?: string; b: number }>(T).type.toString.snap(
				"{ a?: string; b: number }"
			)
		})

		it("default of the wrong type is not an error", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string", default: 5 } }
			})
			attest<{ a?: string }>(T).type.toString.snap("{ a?: string }")
		})

		it("every annotation", () => {
			const T = inferred({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				$id: "https://example.com/person.schema.json",
				$comment: "a person",
				title: "Person",
				description: "A person",
				examples: [{ name: "Alice" }],
				deprecated: false,
				"x-internal": true,
				type: "object",
				properties: {
					name: {
						title: "Name",
						description: "The name",
						examples: ["Alice"],
						deprecated: true,
						$comment: "unused",
						"x-order": 1,
						type: "string"
					}
				},
				required: ["name"]
			})
			attest<{ name: string }>(T).type.toString.snap("{ name: string }")
		})

		it("propertyNames, counts, dependencies and unevaluatedProperties", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				propertyNames: { maxLength: 3 },
				dependentRequired: { a: ["b"] },
				dependentSchemas: { a: { required: ["c"] } },
				unevaluatedProperties: false,
				minProperties: 1
			})
			attest<{ a: string }>(T).type.toString.snap("{ a: string }")
		})
	})

	describe("additionalProperties", () => {
		it("true", () => {
			const T = jsonSchemaToType({ type: "object", additionalProperties: true })
			attest<object>(T.infer).type.toString.snap("object")
		})

		it("false", () => {
			const T = jsonSchemaToType({
				type: "object",
				additionalProperties: false
			})
			attest<object>(T.infer).type.toString.snap("object")
		})

		it("empty schema", () => {
			const T = inferred({ type: "object", additionalProperties: {} })
			attest<{ [k: string]: unknown }>(T).type.toString.snap(
				"{ [x: string]: unknown }"
			)
		})

		it("schema", () => {
			const T = inferred({
				type: "object",
				additionalProperties: { type: "number" }
			})
			attest<{ [k: string]: number }>(T).type.toString.snap(
				"{ [x: string]: number }"
			)
		})

		it("negated empty schema", () => {
			const T = inferred({ type: "object", additionalProperties: { not: {} } })
			attest<{ [k: string]: never }>(T).type.toString.snap(
				"{ [x: string]: never }"
			)
		})

		it("false with properties", () => {
			const T = jsonSchemaToType({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				additionalProperties: false
			})
			attest<{ a: string }>(T.infer).type.toString.snap("{ a: string }")
		})

		it("declared property narrower than additional", () => {
			const T = inferred({
				type: "object",
				properties: { kind: { const: "a" } },
				required: ["kind"],
				additionalProperties: { type: "string" }
			})
			attest<{ [k: string]: string; kind: "a" }>(T).type.toString.snap(
				'{ [x: string]: string; kind: "a" }'
			)
		})

		it("declared property incompatible with additional", () => {
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

		it("required without properties with additional schema", () => {
			const T = inferred({
				type: "object",
				required: ["a"],
				additionalProperties: { type: "number" }
			})
			attest<{ [k: string]: number; a: number }>(T).type.toString.snap(
				"{ [x: string]: number; a: number }"
			)
		})

		it("required without properties with additional false", () => {
			const T = inferred({
				type: "object",
				required: ["a"],
				additionalProperties: false
			})
			attest<{ a: unknown }>(T).type.toString.snap("{ a: unknown }")
		})

		it("recursive via root", () => {
			type Tree = { [k: string]: Tree }
			const T = inferred({
				type: "object",
				additionalProperties: { $ref: "#" }
			})
			attest<Tree>(T)
			attest<Tree, (typeof T)["a"]["b"]["c"]>()
		})
	})

	describe("patternProperties", () => {
		it("single", () => {
			const T = jsonSchemaToType({
				type: "object",
				patternProperties: { "^x-": { type: "string" } }
			})
			attest<{ [k: string]: unknown }>(T.infer).type.toString.snap(
				"{ [x: string]: unknown }"
			)
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
			attest<{ [k: string]: string | number | boolean }>(T).type.toString.snap(
				"{ [x: string]: string | number | boolean }"
			)
		})

		it("with incompatible properties", () => {
			const T = inferred({
				type: "object",
				properties: { count: { type: "number" } },
				required: ["count"],
				patternProperties: { "^x-": { type: "string" } },
				additionalProperties: false
			})
			attest<{ [k: string]: string | number; count: number }>(
				T
			).type.toString.snap("{ [x: string]: string | number; count: number }")
		})

		it("with wider properties and additionalProperties", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: ["string", "number", "boolean"] } },
				patternProperties: { "^n_": { type: "number" } },
				additionalProperties: { type: "boolean" }
			})
			attest<{
				[k: string]: string | number | boolean
				a?: string | number | boolean
			}>(T).type.toString.snap(`{
	[x: string]: string | number | boolean
	a?: string | number | boolean
}`)
		})

		it("empty", () => {
			const T = inferred({ type: "object", patternProperties: {} })
			attest<object>(T).type.toString.snap("object")
		})

		it("false pattern", () => {
			const T = inferred({
				type: "object",
				patternProperties: { "^x-": false }
			})
			attest<object>(T).type.toString.snap("object")
		})

		it("false pattern with a schema pattern", () => {
			const T = inferred({
				type: "object",
				patternProperties: { "^x-": false, "^n_": { type: "number" } },
				additionalProperties: false
			})
			attest<{ [k: string]: number }>(T).type.toString.snap(
				"{ [x: string]: number }"
			)
		})

		it("false pattern with properties and additionalProperties false", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				patternProperties: { "^x-": false },
				additionalProperties: false
			})
			attest<{ a?: string }>(T).type.toString.snap("{ a?: string }")
		})

		it("false pattern with a required key and additionalProperties false", () => {
			const T = inferred({
				type: "object",
				patternProperties: { "^x-": false },
				additionalProperties: false,
				required: ["a"]
			})
			attest<{ a: unknown }>(T).type.toString.snap("{ a: unknown }")
		})

		it("required key without property schema or additionalProperties", () => {
			const T = inferred({
				type: "object",
				patternProperties: { "^x-": { type: "string" } },
				required: ["x-id"]
			})
			attest<{ [k: string]: unknown; "x-id": unknown }>(T).type.toString.snap(
				'{ [x: string]: unknown; "x-id": unknown }'
			)
		})

		it("required key without property schema and additionalProperties schema", () => {
			const T = inferred({
				type: "object",
				patternProperties: { "^x-": { type: "string" } },
				additionalProperties: { type: "number" },
				required: ["x-id"]
			})
			attest<{ [k: string]: string | number; "x-id": string | number }>(T).type
				.toString.snap(`{
	[x: string]: string | number
	"x-id": string | number
}`)
		})
	})

	describe("propertyNames", () => {
		it("enum doesn't narrow the keys", () => {
			const T = inferred({
				type: "object",
				propertyNames: { enum: ["a", "b"] }
			})
			attest<object>(T).type.toString.snap("object")
		})

		it("doesn't narrow the index key", () => {
			const T = inferred({
				type: "object",
				propertyNames: { pattern: "^[a-z]+$" },
				additionalProperties: { type: "number" }
			})
			attest<{ [k: string]: number }>(T).type.toString.snap(
				"{ [x: string]: number }"
			)
		})

		it("non-string type is an error", () => {
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

		it("single string type list", () => {
			attest(() =>
				inferred({
					type: "object",
					propertyNames: {
						type: ["string"]
					}
				})
			).type.errors.is("")
		})

		it("invalid count", () => {
			attest(() =>
				inferred({
					type: "object",
					propertyNames: {
						type: "string",
						// @ts-expect-error
						maxLength: -1
					}
				})
			).type.errors("maxLength must be a non-negative integer (was -1)")
		})

		it("non-schema", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					propertyNames: "string"
				})
			).type.errors("JSON Schema must be an object or a boolean (was string)")
		})
	})

	describe("minProperties and maxProperties", () => {
		it("zero", () => {
			const T = inferred({
				type: "object",
				minProperties: 0,
				maxProperties: 0
			})
			attest<object>(T).type.toString.snap("object")
		})

		it("fewer than required", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" }, b: { type: "string" } },
				required: ["a", "b"],
				maxProperties: 1
			})
			attest<{ a: string; b: string }>(T).type.toString.snap(
				"{ a: string; b: string }"
			)
		})

		it("widened", () => {
			const minProperties: number = 1
			const T = inferred({ type: "object", minProperties })
			attest<object>(T).type.toString.snap("object")
		})

		it("negative minProperties", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "object", minProperties: -1 })
			).type.errors("minProperties must be a non-negative integer (was -1)")
		})

		it("non-integer maxProperties", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "object", maxProperties: 2.5 })
			).type.errors("maxProperties must be a non-negative integer (was 2.5)")
		})

		it("string value", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "object", minProperties: "1" })
			).type.errors("Type 'string' is not assignable to type 'number'")
		})

		it("exponent fraction", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "object", minProperties: 1e-7 })
			).type.errors.snap(
				"Type 'number' is not assignable to type '\"minProperties must be a non-negative integer (was 1e-7)​\"'."
			)
		})

		it("large exponent integer", () => {
			attest(() =>
				inferred({ type: "object", maxProperties: 1.5e21 })
			).type.errors.is("")
		})
	})

	describe("dependencies", () => {
		it("dependentRequired with unknown keys", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				dependentRequired: { x: ["y"] }
			})
			attest<{ a?: string }>(T).type.toString.snap("{ a?: string }")
		})

		it("draft-07 dependencies", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" }, b: { type: "string" } },
				dependencies: {
					a: ["b"],
					b: { properties: { c: { type: "number" } } }
				}
			})
			attest<{ a?: string; b?: string }>(T).type.toString.snap(
				"{ a?: string; b?: string }"
			)
		})

		it("dependentSchemas non-schema", () => {
			attest(() =>
				inferred({
					type: "object",
					dependentSchemas: {
						// @ts-expect-error
						a: 5
					}
				})
			).type.errors("JSON Schema must be an object or a boolean (was number)")
		})

		it("dependentSchemas nested error", () => {
			attest(() =>
				inferred({
					type: "object",
					dependentSchemas: {
						a: {
							properties: {
								// @ts-expect-error
								b: { type: "strng" }
							}
						}
					}
				})
			).type.errors(`Did you mean '"string"'?`)
		})

		it("dependentRequired non-array", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "object", dependentRequired: { a: "b" } })
			).type.errors.snap(
				"Type 'string' is not assignable to type 'readonly string[]'."
			)
		})

		it("dependencies nested error", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					dependencies: { a: { type: "strng" } }
				})
			).type.errors.snap(
				"Type '\"strng\"' is not assignable to type 'TypeName'. Did you mean '\"string\"'?"
			)
		})
	})

	describe("unevaluatedProperties", () => {
		it("doesn't add to the index", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				additionalProperties: { type: "number" },
				unevaluatedProperties: { type: "boolean" }
			})
			attest<{ [k: string]: string | number; a?: string }>(
				T
			).type.toString.snap("{ [x: string]: string | number; a?: string }")
		})

		it("non-schema", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					unevaluatedProperties: "no"
				})
			).type.errors("JSON Schema must be an object or a boolean (was string)")
		})

		it("nested error", () => {
			attest(() =>
				inferred({
					type: "object",
					unevaluatedProperties: {
						// @ts-expect-error
						type: "nul"
					}
				})
			).type.errors(`Did you mean '"null"'?`)
		})
	})

	describe("implied objects", () => {
		it("properties", () => {
			const T = inferred({
				properties: { a: { type: "string" } },
				required: ["a"]
			})
			attest<string | number | boolean | unknown[] | { a: string } | null>(T)
				.type.toString.snap(`	| string
	| number
	| boolean
	| unknown[]
	| { a: string }
	| null`)
		})

		it("additionalProperties", () => {
			const T = inferred({ additionalProperties: { type: "string" } })
			attest<
				string | number | boolean | unknown[] | { [x: string]: string } | null
			>(T).type.toString.snap(`	| string
	| number
	| boolean
	| unknown[]
	| { [x: string]: string }
	| null`)
		})

		it("with enum", () => {
			const T = inferred({
				properties: { a: { type: "string" } },
				enum: [{ a: "x" }, { a: "y" }]
			})
			attest<{ readonly a: "x" } | { readonly a: "y" }>(T).type.toString.snap(
				'{ readonly a: "x" } | { readonly a: "y" }'
			)
		})

		it("with not null", () => {
			const T = inferred({
				properties: { a: { type: "string" } },
				not: { type: "null" }
			})
			attest<string | number | boolean | unknown[] | { a?: string }>(T).type
				.toString.snap(`	| string
	| number
	| boolean
	| unknown[]
	| { a?: string }`)
		})

		it("with array keywords", () => {
			const T = inferred({
				properties: { a: { type: "string" } },
				items: { type: "number" }
			})
			attest<string | number | boolean | { a?: string } | number[] | null>(T)
				.type.toString.snap(`	| string
	| number
	| boolean
	| { a?: string }
	| number[]
	| null`)
		})

		it("with anyOf branches", () => {
			const T = inferred({
				properties: { kind: { type: "string" } },
				required: ["kind"],
				anyOf: [
					{ properties: { a: { type: "number" } }, required: ["a"] },
					{ properties: { b: { type: "boolean" } }, required: ["b"] }
				]
			})
			attest<
				| string
				| number
				| boolean
				| unknown[]
				| { kind: string; a: number }
				| { kind: string; b: boolean }
				| null
			>(T).type.toString.snap(`	| string
	| number
	| boolean
	| unknown[]
	| { kind: string; a: number }
	| { kind: string; b: boolean }
	| null`)
		})

		it("ignores keywords of other types", () => {
			const T = inferred({
				type: "object",
				items: { type: "string" },
				minLength: 1,
				maximum: 5
			})
			attest<object>(T).type.toString.snap("object")
		})

		it("nullable false", () => {
			const T = inferred({ type: "object", nullable: false })
			attest<object>(T).type.toString.snap("object")
		})

		it("keywords that don't imply an object", () => {
			attest<unknown>(inferred({ propertyNames: { maxLength: 3 } }))
			attest<unknown>(inferred({ minProperties: 1 }))
			attest<unknown>(inferred({ maxProperties: 1 }))
			attest<unknown>(inferred({ dependentRequired: { a: ["b"] } }))
			attest<unknown>(
				inferred({ dependentSchemas: { a: { required: ["b"] } } })
			)
			attest<unknown>(inferred({ dependencies: { a: ["b"] } }))
			attest<unknown>(inferred({ unevaluatedProperties: false }))
		})
	})

	describe("type lists", () => {
		it("object or null", () => {
			const T = jsonSchemaToType({
				type: ["object", "null"],
				properties: { a: { type: "string" } },
				required: ["a"]
			})
			attest<{ a: string } | null>(T.infer).type.toString.snap(
				"{ a: string } | null"
			)
		})

		it("object or array", () => {
			const T = inferred({
				type: ["object", "array"],
				properties: { a: { type: "string" } },
				items: { type: "number" }
			})
			attest<{ a?: string } | number[]>(T).type.toString.snap(
				"{ a?: string } | number[]"
			)
		})

		it("object with nullable", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				nullable: true
			})
			attest<{ a?: string } | null>(T).type.toString.snap(
				"{ a?: string } | null"
			)
		})
	})

	describe("const and enum", () => {
		it("object const", () => {
			const T = inferred({ type: "object", const: { a: 1 } })
			attest<{ readonly a: 1 }>(T).type.toString.snap("{ readonly a: 1 }")
		})

		it("non-object const", () => {
			attest<never>(inferred({ type: "object", const: "a" }))
			attest<never>(inferred({ type: "object", const: null }))
			attest<never>(inferred({ type: "object", const: 1 }))
		})

		it("enum filtered by type", () => {
			const T = inferred({
				type: "object",
				enum: [{ a: 1 }, "x", null, 5, { b: true }]
			})
			attest<{ readonly a: 1 } | { readonly b: true }>(T).type.toString.snap(
				"{ readonly a: 1 } | { readonly b: true }"
			)
		})

		it("with properties", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "number" } },
				const: { a: 1 }
			})
			attest<{ readonly a: 1 }>(T).type.toString.snap("{ readonly a: 1 }")
		})

		it("with conflicting properties", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				const: { a: 1 }
			})
			// a conflicting literal is intersected with the base, which leaves an
			// uninhabited object rather than never
			attest<{ a: never }>(T).type.toString.snap("{ a: never }")
		})

		it("enum with nullable", () => {
			const T = inferred({
				type: "object",
				nullable: true,
				enum: [{ a: 1 }, null]
			})
			attest<{ readonly a: 1 } | null>(T).type.toString.snap(
				"{ readonly a: 1 } | null"
			)
		})
	})

	describe("const and enum objects against the base", () => {
		it("a literal missing a required key", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				enum: [{ b: 1 }, { a: "x" }]
			})
			// the missing key is added from the base rather than rejecting the literal
			attest<{ readonly a: "x" } | { a: string; readonly b: 1 }>(
				T
			).type.toString.snap('{ readonly a: "x" } | { a: string; readonly b: 1 }')
		})

		it("a literal beside optional properties", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "number" } },
				const: { b: 1 }
			})
			attest<{ a?: number; readonly b: 1 }>(T).type.toString.snap(
				"{ a?: number; readonly b: 1 }"
			)
		})

		it("string literal against an optional array property", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "array" } },
				enum: [{ a: "x" }, { a: [] }]
			})
			attest<{ a: never } | { a: readonly [] }>(T).type.toString.snap(
				"{ a: never } | { a: readonly [] }"
			)
		})

		it("const through a remote ref keeps the literal", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { $ref: "https://example.com/s" } }
				const: { a: 1 }
			}>
			attest<{ a: 1 }, T>()
		})

		it("enum on a node its own properties $ref", () => {
			attest<{} | { readonly a: {} } | { readonly a: { readonly a: {} } }>(
				inferred({
					type: "object",
					properties: { a: { $ref: "#" } },
					enum: [{}, { a: {} }, { a: { a: {} } }]
				})
			).type.toString.snap(`	| {}
	| { readonly a: {} }
	| { readonly a: { readonly a: {} } }`)
		})

		it("const objects nested forty deep", () => {
			type nest<s, depth extends 1[]> =
				depth["length"] extends 40 ? s
				:	nest<
						{
							type: "object"
							properties: { a: s }
							required: ["a"]
							const: { a: {} }
						},
						[...depth, 1]
					>
			type T = jsonSchema.infer<nest<{ type: "object" }, []>>
			// each level's `a` must itself have an `a`, which the const lacks
			attest({} as T).type.toString.snap(`{
	a: {
		a: {
			a: {
				a: {
					a: {
						a: { a: { a: { a: { a: { a: cyclic } } } } }
					}
				}
			}
		}
	}
}`)
		})

		it("a widened value", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { enum: ["b", "c"] } }
				const: { a: string }
			}>
			attest<{ a: "b" | "c" }>({} as T).type.toString.snap('{ a: "b" | "c" }')
		})

		it("a widened record may have every required key", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { type: "number" } }
				required: ["a"]
				const: Record<string, number>
			}>
			attest<{ [x: string]: number; a: number }>({} as T).type.toString.snap(
				"{ [x: string]: number; a: number }"
			)
		})
	})

	describe("not with object values", () => {
		it("not the empty object", () => {
			const T = inferred({ type: "object", not: { const: {} } })
			attest<object>(T).type.toString.snap("object")
		})

		it("not an object const matching the base", () => {
			const T = inferred({
				type: "object",
				properties: { a: { const: 1 } },
				required: ["a"],
				not: { const: { a: 1 } }
			})
			attest<{ a: 1 }>(T).type.toString.snap("{ a: 1 }")
		})

		it("not an enum of an object and null", () => {
			const T = inferred({
				type: ["object", "null"],
				not: { enum: [{}, null] }
			})
			attest<object>(T).type.toString.snap("object")
		})

		it("not a tuple const containing an object", () => {
			const T = inferred({
				type: "array",
				prefixItems: [
					{ type: "object", properties: { a: { const: 1 } }, required: ["a"] }
				],
				minItems: 1,
				items: false,
				not: { const: [{ a: 1 }] }
			})
			attest<[{ a: 1 }]>(T).type.toString.snap("[{ a: 1 }]")
		})

		it("not an exact closed tuple excludes it", () => {
			const T = inferred({
				type: "array",
				prefixItems: [{ const: 1 }],
				minItems: 1,
				items: false,
				not: { const: [1] }
			})
			attest<never>(T).type.toString.snap("never")
		})

		it("not an array const keeps the recursion", () => {
			// a structured not beside a ref is skipped
			const T = inferred({
				type: "object",
				properties: { a: { $ref: "#" }, b: { type: "string" } },
				not: { const: [1] }
			})
			type A = Exclude<Exclude<(typeof T)["a"], undefined>["a"], undefined>
			attest(of<unknown extends A ? true : false>()).type.toString.snap("false")
		})

		it("not a primitive const keeps the recursion", () => {
			const T = inferred({
				type: "object",
				properties: { a: { $ref: "#" }, b: { type: "string" } },
				not: { const: "x" }
			})
			type A = Exclude<Exclude<(typeof T)["a"], undefined>["a"], undefined>
			attest(of<unknown extends A ? true : false>()).type.toString.snap("false")
		})
	})

	describe("composition", () => {
		it("allOf merges properties", () => {
			const T = inferred({
				allOf: [
					{
						type: "object",
						properties: { a: { type: "string" } },
						required: ["a"]
					},
					{ type: "object", properties: { b: { type: "number" } } }
				]
			})
			attest<{ a: string; b?: number }>(T).type.toString.snap(
				"{ a: string; b?: number }"
			)
		})

		it("allOf with optional and required of the same key", () => {
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
			attest<{ a: string }>(T).type.toString.snap("{ a: string }")
		})

		it("allOf with base properties", () => {
			const T = inferred({
				type: "object",
				properties: { id: { type: "string" } },
				required: ["id"],
				allOf: [{ properties: { name: { type: "string" } } }]
			})
			attest<{ id: string; name?: string }>(T).type.toString.snap(
				"{ id: string; name?: string }"
			)
		})

		it("allOf with additionalProperties", () => {
			const T = inferred({
				allOf: [
					{ type: "object", additionalProperties: { type: "string" } },
					{
						type: "object",
						properties: { a: { type: "string" } },
						required: ["a"]
					}
				]
			})
			attest<{ [k: string]: string; a: string }>(T).type.toString.snap(
				"{ [x: string]: string; a: string }"
			)
		})

		it("three-level property merge", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{
						properties: {
							a: {
								type: "object",
								properties: {
									b: {
										type: "object",
										properties: { x: { type: "string" } }
									}
								}
							}
						}
					},
					{
						properties: {
							a: {
								properties: {
									b: { properties: { y: { type: "number" } }, required: ["y"] }
								},
								required: ["b"]
							}
						},
						required: ["a"]
					}
				]
			})
			attest<{ a: { b: { x?: string; y: number } } }>(T).type.toString.snap(
				"{ a: { b: { x?: string; y: number } } }"
			)
		})

		it("closed allOf branch doesn't constrain another branch's keys", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{
						properties: { a: { type: "string" } },
						additionalProperties: false
					},
					{ properties: { b: { type: "number" } }, required: ["b"] }
				]
			})
			attest<{ a?: string; b: number }>(T).type.toString.snap(
				"{ a?: string; b: number }"
			)
		})

		it("nullable object in allOf", () => {
			const T = inferred({
				allOf: [
					{
						type: "object",
						nullable: true,
						properties: { a: { type: "string" } }
					},
					{ required: ["a"] }
				]
			})
			attest<{ a: string } | null>(T).type.toString.snap("{ a: string } | null")
		})

		it("oneOf discriminated", () => {
			const T = inferred({
				type: "object",
				oneOf: [
					{
						properties: { kind: { const: "a" }, a: { type: "string" } },
						required: ["kind", "a"]
					},
					{
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
		})

		it("base required key typed by anyOf branches", () => {
			const T = inferred({
				type: "object",
				required: ["a"],
				anyOf: [
					{ properties: { a: { type: "string" } } },
					{ properties: { a: { type: "number" } } }
				]
			})
			attest<{ a: string } | { a: number }>(T).type.toString.snap(
				"{ a: string } | { a: number }"
			)
		})

		it("nested composition sees the outer properties", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				allOf: [
					{
						anyOf: [{ properties: { c: { type: "string" } }, required: ["a"] }]
					}
				]
			})
			attest<{ a: string; c?: string }>(T).type.toString.snap(
				"{ a: string; c?: string }"
			)
		})

		it("if then else on objects", () => {
			const T = inferred({
				type: "object",
				if: { properties: { kind: { const: "a" } } },
				then: { required: ["a"] },
				else: { required: ["b"] }
			})
			attest<{ a: unknown } | { b: unknown }>(T).type.toString.snap(
				"{ a: unknown } | { b: unknown }"
			)
		})

		it("not sees the outer properties", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" }, b: { type: "string" } },
				not: { properties: {}, required: ["a", "b"] }
			})
			attest<{ a?: string; b?: string }>(T).type.toString.snap(
				"{ a?: string; b?: string }"
			)
		})
	})

	describe("index signatures across subschemas", () => {
		it("allOf index constrains a base required key", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				allOf: [{ additionalProperties: { type: "number" } }]
			})
			attest<{ [k: string]: number; a: never }>(T).type.toString.snap(
				"{ [x: string]: number; a: never }"
			)
		})

		it("allOf index narrows a base optional key", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				allOf: [{ additionalProperties: { type: ["string", "number"] } }]
			})
			attest<{ [k: string]: string | number; a?: string }>(
				T
			).type.toString.snap("{ [x: string]: string | number; a?: string }")
			const empty: typeof T = {}
			const extra: typeof T = { a: "x", b: 1 }
			attest(empty).type.toString.snap(
				"{ [x: string]: string | number; a?: string }"
			)
			attest(extra.b).type.toString.snap("string | number")
		})

		it("a base index constrains a branch's undeclared key", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "number" } },
				additionalProperties: { type: "string" },
				allOf: [{ properties: { b: { type: "boolean" } } }]
			})
			attest<{ [k: string]: string | number; a?: number; b?: never }>(
				T
			).type.toString.snap(
				`{
	[x: string]: string | number
	a?: number
	b?: never
}`
			)
		})

		it("closed pattern branch forbids a key it doesn't match", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{
						patternProperties: { "^a": { type: "string" } },
						additionalProperties: false
					},
					{ properties: { b: { type: "number" } } }
				]
			})
			attest<{ [k: string]: string; b?: never }>(T).type.toString.snap(
				"{ [x: string]: string; b?: never }"
			)
		})

		it("two closed pattern branches", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{
						patternProperties: { "^a": { type: "string" } },
						additionalProperties: false
					},
					{
						patternProperties: { "^b": { type: "number" } },
						additionalProperties: false
					}
				]
			})
			attest<{ [k: string]: never }>(T).type.toString.snap(
				"{ [x: string]: never }"
			)
		})

		it("branch required key from a pattern branch", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{
						patternProperties: { "^a": { type: "string" } },
						additionalProperties: false
					},
					{ required: ["a"] }
				]
			})
			attest<{ [k: string]: string; a: string }>(T).type.toString.snap(
				"{ [x: string]: string; a: string }"
			)
		})

		it("$ref sibling additionalProperties constrains the target's keys", () => {
			const T = inferred({
				$defs: {
					base: { type: "object", properties: { a: { type: "number" } } }
				},
				$ref: "#/$defs/base",
				additionalProperties: { type: "string" }
			})
			attest<{ [k: string]: string; a?: never }>(T).type.toString.snap(
				"{ [x: string]: string; a?: never }"
			)
		})

		it("$ref to true as additionalProperties", () => {
			const T = inferred({
				type: "object",
				$defs: { t: true },
				properties: { a: { type: "string" } },
				additionalProperties: { $ref: "#/$defs/t" }
			})
			attest<{ [k: string]: unknown; a?: string }>(T).type.toString.snap(
				"{ [x: string]: unknown; a?: string }"
			)
		})

		it("nested index signatures intersect across allOf", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{
						additionalProperties: { properties: { x: { type: "string" } } }
					},
					{
						additionalProperties: {
							type: "object",
							properties: { y: { type: "number" } }
						}
					}
				]
			})
			attest<{ [k: string]: { x?: string; y?: number } }>(T).type.toString.snap(
				"{ [x: string]: { x?: string; y?: number } }"
			)
		})

		it("index branch merged with an optional key rejects undefined", () => {
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

		it("recursive index value includes the declared recursive key", () => {
			const T = inferred({
				type: "object",
				properties: { a: { $ref: "#" } },
				required: ["x"],
				additionalProperties: { type: "string" }
			})
			attest<string, (typeof T)["x"]>()
			attest<string, NonNullable<(typeof T)["a"]>["x"]>()
		})

		it("inferred objects are mutable", () => {
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
		// limitation: merging a recursive allOf branch into an index that includes it displays internal mapped types (shapeOf/intersectValues); the type itself is correct
		it("mutually recursive allOf with a recursive index", () => {
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
			attest(T).type.toString(/shapeOf<.*intersectValues</s)
		})

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
		})

		// limitation: an allOf branch whose index value is the node itself loses its index under the node's own type, so { x: {} } is rejected
		it("recursive index in an allOf branch beside properties", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{ additionalProperties: { $ref: "#" } },
					{ properties: { a: true } }
				]
			})
			// { x: {} } is valid, but a weak `{ a?: ... }` rejects it
			attest(
				of<{ x: {} } extends typeof T ? true : false>()
			).type.toString.snap("false")
			attest(T).type.toString.snap("{ a?: cyclic }")
		})

		it("recursive index in an allOf branch without a type", () => {
			const T = inferred({
				allOf: [
					{ type: "object", additionalProperties: { $ref: "#" } },
					{ required: ["z"] }
				]
			})
			attest(T).type.toString.snap("{ [x: string]: cyclic; z: cyclic }")
		})

		it("recursive index at the node beside an allOf properties branch", () => {
			const T = inferred({
				type: "object",
				additionalProperties: { $ref: "#" },
				allOf: [{ properties: { a: { type: "string" } } }]
			})
			attest(T).type.toString.snap("{ [x: string]: cyclic; a?: never }")
		})

		it("allOf inheritance with recursive properties", () => {
			const T = inferred({
				$defs: {
					base: {
						type: "object",
						properties: { id: { type: "string" } },
						required: ["id"]
					},
					cat: {
						allOf: [
							{ $ref: "#/$defs/base" },
							{
								type: "object",
								properties: {
									subs: { type: "array", items: { $ref: "#/$defs/cat" } },
									parent: { $ref: "#/$defs/cat" }
								}
							}
						]
					}
				},
				$ref: "#/$defs/cat"
			})
			attest(T).type.toString.snap(
				"{ id: string; subs?: cyclic[]; parent?: cyclic }"
			)
			const ok: typeof T = { id: "x", subs: [{ id: "y", parent: { id: "z" } }] }
			// @ts-expect-error
			const bad: typeof T = { id: "x", subs: [{ id: 1 }] }
			attest([ok, bad])
		})

		it("JSON value", () => {
			const T = inferred({
				$defs: {
					json: {
						anyOf: [
							{ type: "string" },
							{ type: "number" },
							{ type: "boolean" },
							{ type: "null" },
							{ type: "array", items: { $ref: "#/$defs/json" } },
							{
								type: "object",
								additionalProperties: { $ref: "#/$defs/json" }
							}
						]
					}
				},
				$ref: "#/$defs/json"
			})
			const ok: typeof T = { a: [1, "x", { b: null }], c: { d: true } }
			// @ts-expect-error
			const bad: typeof T = { a: [undefined] }
			attest([ok, bad])
			attest(of<0 extends 1 & typeof T ? true : false>()).type.toString.snap(
				"false"
			)
		})
	})

	describe("merge scale", () => {
		it("nested allOf with an index branch at each level, twenty deep", () => {
			type nest<s, depth extends 1[]> =
				depth["length"] extends 20 ? s
				:	nest<
						{
							type: "object"
							properties: { a: { type: "number" } }
							allOf: [
								s,
								{ additionalProperties: { type: ["number", "string"] } }
							]
						},
						[...depth, 1]
					>
			type T = jsonSchema.infer<
				nest<{ properties: { leaf: { type: "string" } } }, []>
			>
			attest<number | undefined, T["a"]>()
			attest<string | undefined, T["leaf"]>()
		})

		it("nested allOf sharing a key forty deep", () => {
			type nest<s, depth extends 1[]> =
				depth["length"] extends 40 ? s
				:	nest<
						{
							type: "object"
							properties: { a: { type: "number" } }
							allOf: [s]
						},
						[...depth, 1]
					>
			type T = jsonSchema.infer<
				nest<{ properties: { a: { type: "integer" } } }, []>
			>
			attest<number | undefined, T["a"]>()
		})

		it("inheritance chain through $ref thirty deep", () => {
			type chain<i extends 1[], defs> =
				i["length"] extends 30 ? defs
				:	chain<
						[...i, 1],
						defs & {
							[k in `L${[...i, 1]["length"]}`]: {
								allOf: [
									{ $ref: `#/$defs/L${i["length"]}` },
									{
										type: "object"
										properties: {
											[k in `p${[...i, 1]["length"]}`]: { type: "number" }
										}
									}
								]
							}
						}
					>
			type T = jsonSchema.infer<{
				$defs: chain<
					[],
					{
						L0: {
							type: "object"
							properties: { p0: { type: "number" } }
							required: ["p0"]
						}
					}
				>
				$ref: "#/$defs/L30"
			}>
			attest<number, T["p0"]>()
			attest<number | undefined, T["p30"]>()
		})

		it("allOf of twelve $refs to if/then/else rules", () => {
			attest.instantiations([20000, "instantiations"])
			return inferred({
				type: "object",
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

		it("allOf of four allOf groups of three if/then/else rules", () => {
			attest.instantiations([20000, "instantiations"])
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
	})

	describe("required keys declared by other subschemas", () => {
		it("required beside allOf is only checked to be strings", () => {
			// a key no schema declares can't be told from one an allOf branch adds
			const T = inferred({
				type: "object",
				properties: { id: { type: "string" } },
				required: ["id", "nmae"],
				allOf: [{ properties: { name: { type: "string" } } }]
			})
			attest<{ id: string; nmae: unknown; name?: string }>(
				T
			).type.toString.snap("{ id: string; nmae: unknown; name?: string }")
		})

		it("root required references dependentSchemas properties", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					required: ["a", "b"],
					dependentSchemas: { a: { properties: { b: { type: "string" } } } }
				})
			).type.errors.is("")
		})

		it("unevaluatedProperties turns off the required check", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					required: ["b"],
					unevaluatedProperties: false
				})
			).type.errors.is("")
		})

		// a parent pattern matching the same key applies to the same instance and declares the required key
		it("declared property extended by a matching pattern", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						"x-foo": {
							type: "object",
							properties: { a: { type: "string" } },
							required: ["b"]
						}
					},
					patternProperties: {
						"^x-": { properties: { b: { type: "number" } } }
					}
				})
			).type.errors.is("")
		})

		// the base's subschema for the same property applies to the same instance and declares the key
		it("nested property extended in an allOf branch", () => {
			attest(() =>
				inferred({
					type: "object",
					allOf: [
						{ $ref: "#/$defs/base" },
						{
							properties: {
								metadata: {
									properties: { extra: { type: "string" } },
									required: ["name"]
								}
							}
						}
					],
					$defs: {
						base: {
							properties: {
								metadata: {
									type: "object",
									properties: { name: { type: "string" } }
								}
							}
						}
					}
				})
			).type.errors.is("")
		})

		it("then required references if properties", () => {
			attest(() =>
				inferred({
					type: "object",
					if: { properties: { a: { const: 1 } } },
					then: {
						properties: { b: { type: "string" } },
						required: ["a", "b"]
					},
					else: true
				})
			).type.errors.is("")
		})

		it("required in a oneOf branch may name its parent's keys", () => {
			// branches aren't checked against declared keys, so none are completed
			attest(() =>
				inferred({
					type: "object",
					properties: { alpha: true, beta: true },
					oneOf: [
						{
							properties: { kind: { const: "a" } },
							required: ["kind", "al"]
						}
					]
				})
			).type.errors.is("")
		})

		// any string is valid, but the declared keys are offered
		it("required keys complete beside an additionalProperties schema", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { alpha: true, alps: true, beta: true },
					additionalProperties: { type: "string" },
					required: ["al"]
				})
			).completions({ al: ["alpha", "alps"] })
		})

		// limitation: a branch completes only its own properties, since offering
		// the enclosing node's would mean threading its keys through every branch
		it("anyOf branches requiring declared properties", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { email: true, phone: true },
					anyOf: [{ required: ["em"] }, { required: ["phone"] }]
				})
			).completions({})
		})
	})

	describe("validation", () => {
		it("properties not an object", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "object", properties: 5 })
			).type.errors("not assignable")
		})

		it("properties array", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "object", properties: [{ type: "string" }] })
			).type.errors.snap(
				"Type '{ type: string; }[]' is not assignable to type '{ readonly [k: string]: boolean | object; }'.Index signature for type 'string' is missing in type '{ type: string; }[]'."
			)
		})

		it("null property schema", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					properties: { a: null }
				})
			).type.errors("JSON Schema must be an object or a boolean (was null)")
		})

		it("array property schema", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					properties: { a: [{ type: "string" }] }
				})
			).type.errors("JSON Schema must be an object or a boolean (was array)")
		})

		it("only the bad property is reported", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: { type: "string" },
						// @ts-expect-error
						b: "number",
						c: { type: "boolean" }
					}
				})
			).type.errors.snap(
				"Type '\"number\"' is not assignable to type '\"JSON Schema must be an object or a boolean (was string)​\"'."
			)
		})

		it("required not an array", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					// @ts-expect-error
					required: "a"
				})
			).type.errors.snap(
				"Type 'string' is not assignable to type 'readonly string[]'."
			)
		})

		it("required with a number", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { a: { type: "string" } },
					// @ts-expect-error
					required: ["a", 1]
				})
			).type.errors("not assignable")
		})

		it("required key not in properties", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { name: { type: "string" }, age: { type: "number" } },
					// @ts-expect-error
					required: ["age", "nmae"]
				})
			).type.errors(`Type '"nmae"' is not assignable to type '"age" | "name"'`)
		})

		it("misspelled required key", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { name: { type: "string" }, age: { type: "number" } },
					// @ts-expect-error
					required: ["nam"]
				})
			).type.errors(`Did you mean '"name"'?`)
		})

		it("required key not in empty properties", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {},
					// @ts-expect-error
					required: ["a"]
				})
			).type.errors("not assignable to type 'never'")
		})

		it("required key not in implied properties", () => {
			attest(() =>
				inferred({
					properties: { a: { type: "string" } },
					// @ts-expect-error
					required: ["b"]
				})
			).type.errors(`'"b"' is not assignable to type '"a"'`)
		})

		it("nested required key checked against nested properties", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						outer: {
							type: "object",
							properties: { inner: { type: "string" } },
							// @ts-expect-error
							required: ["outer"]
						}
					}
				})
			).type.errors(`'"outer"' is not assignable to type '"inner"'`)
		})

		it("outer required key checked against outer properties", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						outer: {
							type: "object",
							properties: { inner: { type: "string" } }
						}
					},
					// @ts-expect-error
					required: ["inner"]
				})
			).type.errors(`'"inner"' is not assignable to type '"outer"'`)
		})

		it("additionalProperties non-schema", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					additionalProperties: "string"
				})
			).type.errors("JSON Schema must be an object or a boolean (was string)")
		})

		it("patternProperties non-schema", () => {
			attest(() =>
				inferred({
					type: "object",
					patternProperties: {
						// @ts-expect-error
						"^x-": 1
					}
				})
			).type.errors("JSON Schema must be an object or a boolean (was number)")
		})

		it("patternProperties not an object", () => {
			attest(() =>
				// @ts-expect-error
				inferred({ type: "object", patternProperties: "^x-" })
			).type.errors("not assignable")
		})

		it("deep error placement", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: {
							type: "object",
							additionalProperties: {
								type: "object",
								patternProperties: {
									"^b": {
										type: "object",
										properties: {
											// @ts-expect-error
											c: { type: "strin" }
										}
									}
								}
							}
						}
					}
				})
			).type.errors(`Did you mean '"string"'?`)
		})

		it("unknown keywords in property schemas", () => {
			const T = inferred({
				type: "object",
				properties: {
					a: { type: "string", "x-foo": 1, foo: { bar: true } }
				},
				"x-bar": [1, 2, 3],
				required: ["a"]
			})
			attest<{ a: string }>(T).type.toString.snap("{ a: string }")
		})
	})

	describe("completions", () => {
		it("required keys", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { alpha: true, beta: true, alps: true },
					// @ts-expect-error
					required: ["al"]
				})
			).completions({ al: ["alpha", "alps"] })
		})

		it("required keys after a valid key", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { alpha: true, beta: true },
					// @ts-expect-error
					required: ["alpha", "b"]
				})
			).completions({ b: ["beta"] })
		})

		it("nested required keys", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: {
							properties: { xylophone: true, yak: true },
							// @ts-expect-error
							required: ["xy"]
						}
					}
				})
			).completions({ xy: ["xylophone"] })
		})

		it("property type", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						// @ts-expect-error
						a: { type: "ob" }
					}
				})
			).completions({ ob: ["object"] })
		})

		it("object keywords", () => {
			attest(() =>
				// prettier-ignore
				inferred({ type: "object", "prop": {} })
			).completions({ prop: ["properties", "propertyNames"] })
		})
	})

	describe("real-world shapes", () => {
		it("OpenAPI pet", () => {
			const T = inferred({
				type: "object",
				required: ["name", "photoUrls"],
				properties: {
					id: { type: "integer", format: "int64", example: 10 },
					name: { type: "string", example: "doggie" },
					category: {
						type: "object",
						properties: {
							id: { type: "integer", format: "int64" },
							name: { type: "string" }
						}
					},
					photoUrls: { type: "array", items: { type: "string" } },
					tags: {
						type: "array",
						items: {
							type: "object",
							properties: {
								id: { type: "integer" },
								name: { type: "string" }
							}
						}
					},
					status: {
						type: "string",
						description: "pet status in the store",
						enum: ["available", "pending", "sold"]
					}
				}
			})
			attest<{
				id?: number
				name: string
				category?: { id?: number; name?: string }
				photoUrls: string[]
				tags?: { id?: number; name?: string }[]
				status?: "available" | "pending" | "sold"
			}>(T).type.toString.snap(`{
	id?: number
	name: string
	category?: { id?: number; name?: string }
	photoUrls: string[]
	tags?: { id?: number; name?: string }[]
	status?: "available" | "pending" | "sold"
}`)
		})

		it("OpenAPI inheritance under a oneOf", () => {
			const T = inferred({
				components: {
					schemas: {
						Pet: {
							type: "object",
							properties: {
								petType: { type: "string" },
								name: { type: "string" }
							},
							required: ["petType"]
						},
						Cat: {
							allOf: [
								{ $ref: "#/components/schemas/Pet" },
								{
									type: "object",
									properties: {
										petType: { const: "cat" },
										lives: { type: "integer" }
									},
									required: ["lives"]
								}
							]
						},
						Dog: {
							allOf: [
								{ $ref: "#/components/schemas/Pet" },
								{
									type: "object",
									properties: {
										petType: { const: "dog" },
										bark: { type: "boolean" }
									}
								}
							]
						}
					}
				},
				oneOf: [
					{ $ref: "#/components/schemas/Cat" },
					{ $ref: "#/components/schemas/Dog" }
				]
			})
			attest<
				| { petType: "cat"; name?: string; lives: number }
				| { petType: "dog"; name?: string; bark?: boolean }
			>(T).type.toString
				.snap(`	| { petType: "cat"; name?: string; lives: number }
	| { petType: "dog"; name?: string; bark?: boolean }`)
		})

		it("JSON:API resource", () => {
			const T = inferred({
				$defs: {
					links: {
						type: "object",
						additionalProperties: { type: "string", format: "uri" }
					}
				},
				type: "object",
				required: ["data"],
				properties: {
					data: {
						type: "object",
						required: ["type", "id"],
						properties: {
							type: { type: "string" },
							id: { type: "string" },
							attributes: { type: "object" },
							links: { $ref: "#/$defs/links" }
						},
						additionalProperties: false
					},
					links: { $ref: "#/$defs/links" }
				}
			})
			attest<{
				data: {
					type: string
					id: string
					attributes?: object
					links?: { [k: string]: string }
				}
				links?: { [k: string]: string }
			}>(T).type.toString.snap(`{
	data: {
		type: string
		id: string
		attributes?: object
		links?: { [x: string]: string }
	}
	links?: { [x: string]: string }
}`)
		})

		it("draft-07 config with definitions", () => {
			const T = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				definitions: {
					rule: {
						type: ["string", "object"],
						properties: { level: { enum: ["off", "warn", "error"] } },
						required: ["level"]
					}
				},
				type: "object",
				properties: {
					rules: {
						type: "object",
						additionalProperties: { $ref: "#/definitions/rule" }
					}
				}
			})
			attest<{
				rules?: {
					[k: string]: string | { level: "off" | "warn" | "error" }
				}
			}>(T).type.toString.snap(`{
	rules?: {
		[x: string]:
			| string
			| { level: "error" | "off" | "warn" }
	}
}`)
		})
	})

	describe("jsonSchema values in object schemas", () => {
		it("inferred schema as a property", () => {
			const user = jsonSchema({
				type: "object",
				properties: { name: { type: "string" } },
				required: ["name"]
			})
			const s = jsonSchema({
				type: "object",
				properties: { user, tags: { type: "array", items: user } },
				required: ["user"]
			})
			attest<{ user: { name: string }; tags?: { name: string }[] }>(s.infer)
				.type.toString.snap(`{
	user: { name: string }
	tags?: { name: string }[]
}`)
		})

		it("inferred schema as an allOf mixin", () => {
			const named = jsonSchema({
				type: "object",
				properties: { name: { type: "string" } },
				required: ["name"]
			})
			const s = jsonSchema({
				type: "object",
				allOf: [
					named,
					{ properties: { id: { type: "number" } }, required: ["id"] }
				]
			})
			attest<{ name: string; id: number }>(s.infer).type.toString.snap(
				"{ name: string; id: number }"
			)
		})

		it("asserted schema as a property", () => {
			const user = jsonSchema.as<{ name: string }>({})
			const s = jsonSchema({
				type: "object",
				properties: { user },
				required: ["user"]
			})
			attest(s.infer).type.toString.snap("{ user: { name: string } }")
		})

		it("schema with an infer keyword", () => {
			const s = jsonSchema({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				infer: 5
			})
			attest<{ a: string }>({} as jsonSchema.infer<typeof s>)
			// limitation: the keyword intersects into the `.infer` getter it shares a name with
			attest(s.infer).type.toString.snap("5 & { a: string }")
		})

		it("a nested infer keyword is an annotation", () => {
			const s = jsonSchema({
				type: "object",
				properties: { a: { infer: 5 } },
				required: ["a"]
			})
			attest<{ a: unknown }>(s.infer).type.toString.snap("{ a: unknown }")
		})

		it("property named infer", () => {
			const s = jsonSchema({
				type: "object",
				properties: { infer: { type: "string" } },
				required: ["infer"]
			})
			attest<{ infer: string }>(s.infer).type.toString.snap("{ infer: string }")
		})
	})
})

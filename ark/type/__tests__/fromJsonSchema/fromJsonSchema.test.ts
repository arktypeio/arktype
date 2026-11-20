import { attest, contextualize } from "@ark/attest"
import type { Json } from "@ark/util"
import { fromJsonSchema, type, type JsonSchema } from "arktype"
import { z } from "zod"

const JsonUser = {
	type: "object",
	properties: { name: { type: "string" } },
	required: ["name"]
} as const

contextualize(() => {
	describe("formats", () => {
		it("a JSON Schema literal is checked and inferred", () => {
			const T = fromJsonSchema(JsonUser)
			attest<{ name: string }>(T.infer)
			attest(T.expression).snap("{ name: string } & isNonArray")
		})

		it("OpenAPI 3.0 nullable is read as it's inferred", () => {
			const T = fromJsonSchema({
				type: "object",
				properties: {
					a: { type: "string", nullable: true },
					b: { type: "string", enum: ["x"], nullable: true }
				},
				required: ["a", "b"]
			})
			attest<{ a: string | null; b: "x" }>(T.infer)
			attest(T.expression).snap('{ a: string | null, b: "x" } & isNonArray')
		})

		it("OpenAPI 3.0 nullable without a sibling type", () => {
			const T = fromJsonSchema({
				$defs: {
					Address: {
						type: "object",
						properties: { city: { type: "string" } },
						required: ["city"]
					}
				},
				type: "object",
				properties: {
					allOfRef: { allOf: [{ $ref: "#/$defs/Address" }], nullable: true },
					anyOfVal: {
						anyOf: [{ type: "string" }, { type: "number" }],
						nullable: true
					},
					oneOfVal: {
						oneOf: [{ type: "string" }, { type: "boolean" }],
						nullable: true
					},
					directRef: { $ref: "#/$defs/Address", nullable: true },
					enumVal: { enum: ["a", "b"], nullable: true },
					constVal: { const: "x", nullable: true },
					nonNullAllOf: {
						allOf: [{ $ref: "#/$defs/Address" }],
						nullable: false
					}
				},
				required: [
					"allOfRef",
					"anyOfVal",
					"oneOfVal",
					"directRef",
					"enumVal",
					"constVal",
					"nonNullAllOf"
				]
			})
			attest<{
				allOfRef: { city: string } | null
				anyOfVal: string | number | null
				oneOfVal: string | boolean | null
				directRef: { city: string } | null
				enumVal: "a" | "b" | null
				constVal: "x" | null
				nonNullAllOf: { city: string }
			}>(T.infer)
			const validNulls = {
				allOfRef: null,
				anyOfVal: null,
				oneOfVal: null,
				directRef: null,
				enumVal: null,
				constVal: null,
				nonNullAllOf: { city: "NYC" }
			}
			attest(T.allows(validNulls)).equals(true)
			attest(T.allows({ ...validNulls, nonNullAllOf: null })).equals(false)
			attest(
				T.allows({
					allOfRef: { city: "SF" },
					anyOfVal: 42,
					oneOfVal: true,
					directRef: { city: "LA" },
					enumVal: "b",
					constVal: "x",
					nonNullAllOf: { city: "NYC" }
				})
			).equals(true)

			// recursive $ref with nullable: true
			const Node = fromJsonSchema({
				$defs: {
					Node: {
						type: "object",
						properties: {
							val: { type: "number" },
							next: { allOf: [{ $ref: "#/$defs/Node" }], nullable: true }
						},
						required: ["val", "next"]
					}
				},
				$ref: "#/$defs/Node"
			})
			attest(Node.allows({ val: 1, next: null })).equals(true)
			attest(Node.allows({ val: 1, next: { val: 2, next: null } })).equals(true)
			attest(Node.allows({ val: 1, next: "bad" })).equals(false)
		})

		it("a widened JSON Schema infers unknown", () => {
			const schema: JsonSchema = JSON.parse(`{ "type": "string" }`)
			const T = fromJsonSchema(schema)
			attest<unknown>(T.infer)
			attest(T.expression).snap("string")
		})

		it("a schema TypeScript can't see infers unknown", () => {
			const T = fromJsonSchema(JSON.parse(`{ "type": "string" }`))
			attest<unknown>(T.infer)
			attest(T.expression).snap("string")
		})

		it("a Standard JSON Schema infers and reads its input", () => {
			const T = fromJsonSchema(z.string().transform(s => s.length))
			attest<string>(T.infer)
			attest(T.expression).snap("string")
		})

		it("an arktype Type is read as its input", () => {
			const T = fromJsonSchema(type("string").pipe(s => s.length))
			attest<string>(T.infer)
			attest(T.expression).snap("string")
		})

		it("a Standard Schema without ~standard.jsonSchema", () => {
			const valibotLike = {
				"~standard": { version: 1, vendor: "valibot", validate: () => ({}) }
			} as const
			// @ts-expect-error
			attest(() => fromJsonSchema(valibotLike))
				.throws(
					"Schema must be a Type, a Standard JSON Schema or a JSON Schema (was a valibot Standard Schema without ~standard.jsonSchema)"
				)
				.type.errors("Property 'jsonSchema' is missing")
		})

		it("a Standard JSON Schema that can't be written", () => {
			attest(() => fromJsonSchema(z.date())).throws.snap(
				"ParseError: zod's ~standard.jsonSchema.input threw (Date cannot be represented in JSON Schema)"
			)
		})

		it("a value in none of the formats", () => {
			attest(() => fromJsonSchema(5 as never)).throws.snap(
				"ParseError: Schema must be a Type, a Standard JSON Schema or a JSON Schema (was 5)"
			)
		})

		it("an OpenAPI document's component", () => {
			const document = {
				openapi: "3.1.0",
				components: { schemas: { User: JsonUser } }
			} as const
			const User = fromJsonSchema({
				...document,
				$ref: "#/components/schemas/User"
			})
			attest<{ name: string }>(User.infer)
			attest(User.allows({ name: "Ada" })).equals(true)
			attest(User.allows({})).equals(false)
		})
	})

	describe("Type methods", () => {
		it("a definition is parsed in arktype's own scope", () => {
			const T = fromJsonSchema({ type: "string" }).and("string < 5")
			attest<string>(T.infer)
			attest(T.expression).snap("string <= 4")
		})

		it("extends across formats", () => {
			const V1 = fromJsonSchema(
				z.object({ id: z.string(), age: z.number().int().min(0) })
			)
			const V2 = fromJsonSchema({
				type: "object",
				properties: { id: { type: "string" }, age: { type: "number" } },
				required: ["id"]
			})
			attest(V1.extends(V2)).equals(true)
			// V2 accepts { id: "a" }
			attest(V2.extends(V1)).equals(false)
		})

		it("equals across formats", () => {
			attest(
				fromJsonSchema({ type: "integer", minimum: 0 }).equals(
					type("number.integer >= 0")
				)
			).equals(true)
			attest(
				fromJsonSchema(z.object({ name: z.string() })).equals(
					fromJsonSchema(JsonUser)
				)
			).equals(true)
		})

		it("overlaps across formats", () => {
			const Short = fromJsonSchema({ type: "string", maxLength: 2 })
			attest(Short.overlaps(fromJsonSchema(z.string().min(3)))).equals(false)
			attest(Short.overlaps(fromJsonSchema(z.string().min(2)))).equals(true)
		})

		it("and, or and toJsonSchema across formats", () => {
			const V1 = fromJsonSchema(z.object({ id: z.string(), age: z.number() }))
			const Capped = V1.and(
				fromJsonSchema({
					type: "object",
					properties: { age: { maximum: 120 } }
				})
			)
			attest(Capped.expression).snap(
				"{ age: number <= 120, id: string } & isNonArray"
			)
			attest(Capped.toJsonSchema()).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: {
					age: { type: "number", maximum: 120 },
					id: { type: "string" }
				},
				required: ["age", "id"]
			})
			attest(
				fromJsonSchema(z.string()).or(fromJsonSchema({ type: "number" }))
					.expression
			).snap("number | string")
		})

		it("an arktype object can be an array, a JSON Schema object can't", () => {
			const User = type({ name: "string" })
			const Json = fromJsonSchema(JsonUser)
			attest(Json.extends(User)).equals(true)
			attest(User.extends(Json)).equals(false)
			attest(fromJsonSchema(User.toJsonSchema()).extends(Json)).equals(true)
		})

		it("a Standard Schema's refinements are invisible", () => {
			const Refined = fromJsonSchema(z.string().refine(s => s === "x"))
			attest(fromJsonSchema(z.string()).extends(Refined)).equals(true)
		})
	})

	it("handles recursive $ref in not, oneOf, and if beside sibling keywords", () => {
		const S1 = fromJsonSchema({
			properties: { next: { not: { $ref: "#" }, minimum: 0 } }
		})
		// exercise uncompiled first call and compiled JIT path
		for (let pass = 0; pass < 2; pass++) {
			attest(S1.allows({})).equals(true)
			attest(S1.allows(true)).equals(true)
			attest(S1.allows({ next: 1 })).equals(false)
			attest(S1.allows({ next: true })).equals(false)
			attest(S1.allows({ next: { next: 1 } })).equals(true)
			attest(S1.allows({ next: { next: { next: 1 } } })).equals(false)
		}

		const S2 = fromJsonSchema({
			items: { const: 1, not: { $ref: "#" } }
		})
		for (let pass = 0; pass < 2; pass++) {
			attest(S2.allows(1)).equals(true)
			attest(S2.allows([])).equals(true)
			attest(S2.allows([1])).equals(false)
			attest(S2.allows([2])).equals(false)
		}

		const S2Arr = fromJsonSchema({
			type: "array",
			items: { const: 1, not: { $ref: "#" } }
		})
		for (let pass = 0; pass < 2; pass++) {
			attest(S2Arr.allows(1)).equals(false)
			attest(S2Arr.allows([])).equals(true)
			attest(S2Arr.allows([1])).equals(true)
			attest(S2Arr.allows([2])).equals(false)
		}

		const S3 = fromJsonSchema({
			type: "object",
			properties: {
				child: {
					required: ["id"],
					oneOf: [{ $ref: "#" }, { required: ["leaf"] }]
				}
			}
		})
		for (let pass = 0; pass < 2; pass++) {
			attest(S3.allows({})).equals(true)
			attest(S3.allows({ child: true })).equals(true)
			attest(S3.allows({ child: { id: 1 } })).equals(true)
			attest(S3.allows({ child: { id: 1, leaf: 1 } })).equals(false)
			attest(S3.allows({ child: { leaf: 1 } })).equals(false)
		}

		const S4 = fromJsonSchema({
			properties: {
				next: {
					if: { $ref: "#" },
					then: { minimum: 0 },
					else: { const: true }
				}
			}
		})
		for (let pass = 0; pass < 2; pass++) {
			attest(S4.allows({ next: 1 })).equals(true)
			attest(S4.allows({ next: -1 })).equals(false)
			attest(S4.allows({ next: true })).equals(true)
			attest(S4.allows({ next: { next: -1 } })).equals(false)
		}
	})

	it("tracks const and default value depth separately from schema nesting depth", () => {
		// each value's depth starts over where it's held: 40 levels of schema
		// around a value 63 deep pass 64 together, but neither budget alone. Kept
		// under the ~175 levels of nodes whose `.json` overflows V8's stack
		let nestedValue: Json = 1
		for (let i = 0; i < 63; i++) nestedValue = [nestedValue]
		let deepConst: JsonSchema = { const: nestedValue }
		let deepDefault: JsonSchema = { type: "array", default: nestedValue }
		let nestedData: unknown = nestedValue
		for (let i = 0; i < 40; i++) {
			deepConst = { type: "array", items: deepConst }
			deepDefault = { type: "array", items: deepDefault }
			nestedData = [nestedData]
		}
		const DeepConst = fromJsonSchema(deepConst)
		attest(DeepConst.allows(nestedData)).equals(true)
		attest(DeepConst.allows([[1]])).equals(false)
		const DeepDefault = fromJsonSchema(deepDefault)
		attest(DeepDefault.allows([[]])).equals(true)

		let tooDeep: unknown = 1
		for (let i = 0; i < 20_000; i++) tooDeep = [tooDeep]
		attest(() => fromJsonSchema({ const: tooDeep })).throws(
			"exceeds maximum nesting depth of 64"
		)

		const circular: Record<string, unknown> = {}
		circular.self = circular
		attest(() => fromJsonSchema({ const: circular })).throws(
			"JSON Schema at #/const/self is circular"
		)
	})
})

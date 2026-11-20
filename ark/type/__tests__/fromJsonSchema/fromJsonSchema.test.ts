import { attest, contextualize } from "@ark/attest"
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
})

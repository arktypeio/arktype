import { attest, contextualize } from "@ark/attest"
import { fromJsonSchema } from "arktype"

contextualize(() => {
	it("keywords constrain only their own type", () => {
		const t = fromJsonSchema({
			properties: { a: { type: "string" } },
			required: ["a"],
			minLength: 2
		})
		attest(t.allows({ a: "x" })).equals(true)
		attest(t.allows({})).equals(false)
		attest(t.allows("ab")).equals(true)
		attest(t.allows("a")).equals(false)
		attest(t.allows([])).equals(true)
		attest(t.allows(null)).equals(true)
	})

	it("type list keeps keywords", () => {
		const t = fromJsonSchema({
			type: ["object", "null"],
			properties: { a: { type: "string" } },
			required: ["a"]
		})
		attest(t.expression).snap("{ a: string } & isNonArray | null")
	})

	it("arrays are disjoint from an object branch", () => {
		const t = fromJsonSchema({
			type: ["object", "array"],
			allOf: [{ type: "array" }]
		})
		attest(t.expression).snap("Array")
	})

	it("const outside enum", () => {
		const t = fromJsonSchema({ const: "c", enum: ["a", "b"] })
		attest(t.expression).snap("never")
	})

	it("untyped constrained subschemas read over JSON domains and convert cleanly", () => {
		const T = fromJsonSchema({
			type: "object",
			properties: { n: { minimum: 0 } }
		})
		attest(T.allows({ n: undefined })).equals(false)
		attest(T.allows({ n: 10n })).equals(false)
		attest(T.allows({ n: Symbol("s") })).equals(false)
		attest(T.allows({ n: () => {} })).equals(false)
		attest(T.allows({ n: Number.NaN })).equals(false)
		attest(T.allows({ n: 5 })).equals(true)
		attest(T.allows({ n: "x" })).equals(true)
		attest(T.allows({ n: null })).equals(true)
		attest(T.allows({ n: true })).equals(true)
		attest(T.allows({ n: [] })).equals(true)
		attest(T.allows({ n: {} })).equals(true)
		attest(T.allows({ n: -1 })).equals(false)

		const emitted = T.toJsonSchema()
		const standard = T["~standard"].jsonSchema.input({
			target: "draft-2020-12"
		})
		attest(standard).equals(emitted)
		attest(emitted).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			properties: {
				n: {
					anyOf: [
						{ type: "string" },
						{ type: "number", minimum: 0 },
						{ type: "object", properties: {} },
						{ type: "array" },
						{ type: "boolean" },
						{ type: "null" }
					]
				}
			}
		})
		attest(fromJsonSchema(standard as never).equals(T)).equals(true)

		// unconstrained {} and true stay unknown and round-trip to {}
		const Empty = fromJsonSchema({})
		const True = fromJsonSchema(true)
		attest<unknown>(Empty.infer)
		attest<unknown>(True.infer)
		attest(Empty.allows(undefined)).equals(true)
		attest(True.allows(undefined)).equals(true)
		attest(Empty.toJsonSchema()).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema"
		})
	})
})

import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"

contextualize(() => {
	describe("target option", () => {
		it("generates draft-2020-12 schema by default", () => {
			const T = type({ foo: "string" })
			const schema = T.toJsonSchema()
			attest(schema).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo"]
			})
		})

		it("generates draft-2020-12 schema when specified", () => {
			const T = type({ foo: "string" })
			const schema = T.toJsonSchema({ target: "draft-2020-12" })
			attest(schema).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo"]
			})
		})

		it("generates draft-07 schema when specified", () => {
			const T = type({ foo: "string" })
			const schema = T.toJsonSchema({ target: "draft-07" })
			attest(schema).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo"]
			})
		})
	})

	describe("draft-specific syntax", () => {
		it("draft-2020-12 uses prefixItems for tuples", () => {
			const T = type(["string", "number"])
			const schema = T.toJsonSchema({ target: "draft-2020-12" })
			attest(schema).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "array",
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false,
				minItems: 2
			})
		})

		it("draft-07 uses items array for tuples", () => {
			const T = type(["string", "number"])
			const schema = T.toJsonSchema({ target: "draft-07" })
			attest(schema).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "array",
				items: [{ type: "string" }, { type: "number" }],
				additionalItems: false,
				minItems: 2
			})
		})

		it("draft-2020-12 uses items for variadic tuple elements", () => {
			const T = type(["string", "...", "number[]"])
			const schema = T.toJsonSchema({ target: "draft-2020-12" })
			attest(schema).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "array",
				prefixItems: [{ type: "string" }],
				items: { type: "number" },
				minItems: 1
			})
		})

		it("draft-07 uses additionalItems for variadic tuple elements", () => {
			const T = type(["string", "...", "number[]"])
			const schema = T.toJsonSchema({ target: "draft-07" })
			attest(schema).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "array",
				items: [{ type: "string" }],
				additionalItems: { type: "number" },
				minItems: 1
			})
		})

		it("draft-2020-12 uses $defs for references", () => {
			const types = type.module({
				user: {
					name: "string",
					friend: "user?"
				}
			})
			const schema = types.user.toJsonSchema({
				target: "draft-2020-12"
			}) as Record<string, unknown>
			attest("$defs" in schema).equals(true)
			attest("definitions" in schema).equals(false)
			attest(Object.keys(schema.$defs as object).length > 0).equals(true)
		})

		it("draft-07 uses definitions for references", () => {
			const types = type.module({
				user: {
					name: "string",
					friend: "user?"
				}
			})
			const schema = types.user.toJsonSchema({
				target: "draft-07"
			}) as Record<string, unknown>
			attest("definitions" in schema).equals(true)
			attest("$defs" in schema).equals(false)
			attest(Object.keys(schema.definitions as object).length > 0).equals(true)
		})
	})

	const referencedDefs = (schema: object) =>
		[...new Set(JSON.stringify(schema).match(/(?<="#\/\$defs\/)[^"]+/g))].sort()

	// https://github.com/arktypeio/arktype/issues/1546
	it("discriminated union in a recursive scope", () => {
		const s = scope({
			TypeA: { kind: "'a'", value: "number" },
			TypeB: { kind: "'b'", value: "number" },
			Union: "TypeA | TypeB",
			Node: { source: "SearchNode", data: "Union" },
			SearchNode: "Node"
		})
		const out = s.type("SearchNode").toJsonSchema()

		attest(referencedDefs(out)).equals(Object.keys(out.$defs!).sort())

		const recursive = scope({
			Node: { value: "string", "children?": "Node[]" }
		}).export().Node
		const union2 = type.or(
			type({ kind: "'a'", value: "string" }),
			type({ kind: "'b'", value: "number" })
		)
		const withUnion = type({ recursive, union: union2 }).toJsonSchema()

		attest(referencedDefs(withUnion)).equals(
			Object.keys(withUnion.$defs!).sort()
		)
	})

	// https://github.com/arktypeio/arktype/issues/1612
	it("refs to a structure in a union", () => {
		const Thing = type({ a: "string" }).or("null")
		const out = Thing.toJsonSchema({ useRefs: true })

		attest(referencedDefs(out)).equals(Object.keys(out.$defs!).sort())
	})
})

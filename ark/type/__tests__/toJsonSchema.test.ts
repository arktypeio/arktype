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

	// https://github.com/arktypeio/arktype/issues/1511
	it("refs in a partially overlapping discriminated union", () => {
		const T = type.or(
			{ a: type.enumerated("a", "b", "c"), b: "1" },
			{ a: type.enumerated("a", "e", "f"), b: "2" }
		)
		const out = T.toJsonSchema({ useRefs: true })

		attest(referencedDefs(out)).equals(Object.keys(out.$defs!).sort())
	})

	it("regex flags", () => {
		attest(() => type(/^a/i).toJsonSchema()).throws
			.snap(`ToJsonSchemaError: Can't convert "patternFlags" to JSON Schema. Configure fallback.patternFlags to write it:
{
    code: "patternFlags",
    base: {
        type: "string"
    },
    pattern: "^a",
    flags: "i"
}`)
	})

	it("constrained index key", () => {
		attest(() => type({ "[string <= 3]": "number" }).toJsonSchema()).throws
			.snap(`ToJsonSchemaError: Can't convert "indexKey" to JSON Schema. Configure fallback.indexKey to write it:
{
    code: "indexKey",
    base: {
        type: "object"
    },
    key: {
        type: "string",
        maxLength: 3
    },
    value: {
        type: "number"
    }
}`)
	})

	it("error names where its node is", () => {
		attest(() =>
			type({ user: { tags: ["string", "...", "Date[]"] } }).toJsonSchema()
		).throws('Can\'t convert "date" at user.tags[number] to JSON Schema.')
		attest(() =>
			type({ "[string]": { "weird key": "Date" } }).toJsonSchema()
		).throws('Can\'t convert "date" at [string]["weird key"] to JSON Schema.')
	})

	it("constrained index key with undeclared keys rejected", () => {
		const T = type({ ab: "number", "[string <= 3]": "number", "+": "reject" })
		attest(T.toJsonSchema({ dialect: null })).snap({
			type: "object",
			properties: { ab: { type: "number" } },
			required: ["ab"],
			propertyNames: { type: "string", maxLength: 3 },
			additionalProperties: { type: "number" }
		})
	})

	// https://github.com/arktypeio/arktype/issues/1612
	it("refs to a structure in a union", () => {
		const Thing = type({ a: "string" }).or("null")
		const out = Thing.toJsonSchema({ useRefs: true })

		attest(referencedDefs(out)).equals(Object.keys(out.$defs!).sort())
	})

	it("names defs independently of earlier types", () => {
		const toUserSchema = () =>
			scope({ user: { name: "string", "friends?": "user[]" } })
				.export()
				.user.toJsonSchema({ dialect: null })

		const first = toUserSchema()
		type({ name: "string", "friends?": "string[]" })

		attest(toUserSchema()).equals(first)
		attest(first).snap({
			$ref: "#/$defs/user1",
			$defs: {
				user1: {
					type: "object",
					properties: {
						name: { type: "string" },
						friends: { $ref: "#/$defs/intersection1" }
					},
					required: ["name"]
				},
				intersection1: { type: "array", items: { $ref: "#/$defs/user1" } }
			}
		})
	})

	it("omits function meta", () => {
		const T = type("string").configure({ message: () => "a letter" })
		attest(T.toJsonSchema({ dialect: null })).snap({ type: "string" })
	})

	// https://github.com/arktypeio/arktype/issues/1470
	it("configured union of literals as enum", () => {
		const Provider = type("'sqlite' | 'postgresql'").configure({
			title: "Provider"
		})
		attest(Provider.toJsonSchema({ dialect: null })).snap({
			enum: ["postgresql", "sqlite"],
			title: "Provider"
		})

		const Letter = type("'a' | 'b'").describe("a letter")
		attest(Letter.toJsonSchema({ dialect: null })).snap({
			enum: ["a", "b"],
			description: "a letter"
		})

		const letterMessage = () => "a letter"
		const Messaged = type("'a' | 'b'").configure({ message: letterMessage })
		attest(Messaged.toJsonSchema({ dialect: null })).snap({ enum: ["a", "b"] })

		const Described = type("'a'").describe("first").or("'b'").configure({
			title: "Letter"
		})
		attest(Described.toJsonSchema({ dialect: null })).snap({
			anyOf: [
				{ const: "a", description: "first", title: "Letter" },
				{ const: "b", title: "Letter" }
			],
			title: "Letter"
		})
	})

	// https://github.com/arktypeio/arktype/issues/1571
	it("jsonSchema meta replaces what a node's constraints imply", () => {
		const Even = type("number")
			.narrow(n => n % 2 === 0)
			.configure({
				description: "even",
				jsonSchema: { type: "integer", multipleOf: 2 }
			})
		attest(type({ n: Even }).toJsonSchema({ dialect: null })).snap({
			type: "object",
			properties: {
				n: { description: "even", type: "integer", multipleOf: 2 }
			},
			required: ["n"]
		})
	})

	it("jsonSchema meta isn't configured on references", () => {
		const T = type("string | number").configure({
			jsonSchema: { type: ["string", "number"] }
		})
		attest(T.exclude("number").toJsonSchema({ dialect: null })).snap({
			type: "string"
		})
	})

	// https://github.com/arktypeio/arktype/issues/1475
	it("keywords checked by a predicate", () => {
		const T = type({
			url: "string.url < 100",
			"pattern?": "string.regex",
			"json?": "string.json"
		})
		attest(T.toJsonSchema({ dialect: null })).snap({
			type: "object",
			properties: {
				url: { type: "string", maxLength: 99, format: "uri" },
				pattern: { type: "string", format: "regex" },
				json: {
					type: "string",
					contentMediaType: "application/json",
					description: "a JSON string"
				}
			},
			required: ["url"]
		})
	})
})

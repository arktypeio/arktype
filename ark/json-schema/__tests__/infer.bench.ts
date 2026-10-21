import { bench } from "@ark/attest"
import { jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import type { inferJsonSchema } from "@ark/json-schema/internal/infer.ts"
import {
	allOf30,
	allOfRefDag20,
	allOfRefRules10,
	depth10,
	depth40,
	draft06MetaSchema,
	elseIfChain10,
	enum100,
	inheritanceOneOf20,
	nestedAllOfUnions6,
	nestedTuples10,
	oneOf10,
	oneOf50,
	oneOfRef50,
	prefixItems100,
	properties200,
	properties50,
	refProperties100,
	s3Event,
	tamasfeOneOf
} from "./generated/schemas.ts"

bench.baseline(() => {
	jsonSchemaToType({
		type: "object",
		properties: { _: { type: "array", items: { type: "null" } } },
		required: ["_"]
	})
	jsonSchemaToType({
		type: "array",
		prefixItems: [{ type: "null" }],
		minItems: 1,
		items: false
	})
	jsonSchemaToType({ anyOf: [{ type: "null" }, { const: false }] })
	jsonSchemaToType({ allOf: [{ type: "null" }, { enum: [false] }] })
	jsonSchemaToType({ $defs: { _: { type: "null" } }, $ref: "#/$defs/_" })
})

bench("type string", () => jsonSchemaToType({ type: "string" })).types([
	46,
	"instantiations"
])

bench("string constraints", () =>
	jsonSchemaToType({
		type: "string",
		minLength: 1,
		maxLength: 10,
		pattern: "^a",
		format: "email"
	})
).types([101, "instantiations"])

bench("type list", () =>
	jsonSchemaToType({ type: ["string", "number", "boolean"] })
).types([113, "instantiations"])

bench("const", () => jsonSchemaToType({ const: "nineteen characters" })).types([
	86,
	"instantiations"
])

bench("enum(10)", () =>
	jsonSchemaToType({ enum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] })
).types([120, "instantiations"])

bench("enum(100)", () => jsonSchemaToType(enum100)).types([
	92,
	"instantiations"
])

// equivalent to type({ a: "string[]", b: "number[]", c: { nested: "boolean[]" } })
bench("object literal", () =>
	jsonSchemaToType({
		type: "object",
		properties: {
			a: { type: "array", items: { type: "string" } },
			b: { type: "array", items: { type: "number" } },
			c: {
				type: "object",
				properties: { nested: { type: "array", items: { type: "boolean" } } },
				required: ["nested"]
			}
		},
		required: ["a", "b", "c"]
	})
).types([500, "instantiations"])

// equivalent to type({ "a?": "string[]", "b?": "number[]", "c?": { "nested?": "boolean[]" } })
bench("object literal with optional keys", () =>
	jsonSchemaToType({
		type: "object",
		properties: {
			a: { type: "array", items: { type: "string" } },
			b: { type: "array", items: { type: "number" } },
			c: {
				type: "object",
				properties: { nested: { type: "array", items: { type: "boolean" } } }
			}
		}
	})
).types([274, "instantiations"])

bench("additionalProperties", () =>
	jsonSchemaToType({
		type: "object",
		properties: { a: { type: "string" } },
		required: ["a"],
		additionalProperties: { type: ["string", "number"] }
	})
).types([352, "instantiations"])

// equivalent to type(["string[]", "number[]", ["boolean[]"]])
bench("tuple", () =>
	jsonSchemaToType({
		type: "array",
		prefixItems: [
			{ type: "array", items: { type: "string" } },
			{ type: "array", items: { type: "number" } },
			{
				type: "array",
				prefixItems: [{ type: "array", items: { type: "boolean" } }],
				minItems: 1,
				items: false
			}
		],
		minItems: 3,
		items: false
	})
).types([552, "instantiations"])

bench("anyOf(2)", () =>
	jsonSchemaToType({ anyOf: [{ type: "string" }, { type: "number" }] })
).types([114, "instantiations"])

bench("allOf(2) objects", () =>
	jsonSchemaToType({
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
).types([593, "instantiations"])

bench("if/then/else", () =>
	jsonSchemaToType({
		type: "object",
		properties: { kind: { enum: ["a", "b"] } },
		required: ["kind"],
		if: { properties: { kind: { const: "a" } } },
		then: { properties: { a: { type: "string" } }, required: ["a"] },
		else: { properties: { b: { type: "number" } }, required: ["b"] }
	})
).types([853, "instantiations"])

bench("else-if chain(10)", () => jsonSchemaToType(elseIfChain10)).types([
	3417,
	"instantiations"
])

bench("allOf(30) objects", () => jsonSchemaToType(allOf30)).types([
	24454,
	"instantiations"
])

bench("nested tuples(10)", () => jsonSchemaToType(nestedTuples10)).types([
	1567,
	"instantiations"
])

bench("$ref", () =>
	jsonSchemaToType({
		$defs: { name: { type: "string" } },
		type: "object",
		properties: { first: { $ref: "#/$defs/name" } },
		required: ["first"]
	})
).types([318, "instantiations"])

bench("$ref cyclic", () =>
	jsonSchemaToType({
		type: "object",
		properties: {
			value: { type: "number" },
			children: { type: "array", items: { $ref: "#" } }
		},
		required: ["value"]
	})
).types([440, "instantiations"])

bench("properties(50)", () => jsonSchemaToType(properties50)).types([
	1853,
	"instantiations"
])

bench("properties(200)", () => jsonSchemaToType(properties200)).types([
	6753,
	"instantiations"
])

bench("depth(10)", () => jsonSchemaToType(depth10)).types([
	1587,
	"instantiations"
])

bench("depth(40)", () => jsonSchemaToType(depth40)).types([
	3383,
	"instantiations"
])

bench("prefixItems(100)", () => jsonSchemaToType(prefixItems100)).types([
	4626,
	"instantiations"
])

bench("properties(100) refs", () => jsonSchemaToType(refProperties100)).types([
	11577,
	"instantiations"
])

bench("oneOf(10)", () => jsonSchemaToType(oneOf10)).types([
	3604,
	"instantiations"
])

bench("oneOf(50)", () => jsonSchemaToType(oneOf50)).types([
	16964,
	"instantiations"
])

bench("oneOf(50) refs", () => jsonSchemaToType(oneOfRef50)).types([
	20993,
	"instantiations"
])

bench("draft-06 meta-schema", () => jsonSchemaToType(draft06MetaSchema)).types([
	4007,
	"instantiations"
])

bench("real-world oneOf", () => jsonSchemaToType(tamasfeOneOf)).types([
	6037,
	"instantiations"
])

bench("s3 event", () => jsonSchemaToType(s3Event)).types([
	1442,
	"instantiations"
])

// each definition is reached through two allOf paths
bench("allOf ref DAG(20)", () => jsonSchemaToType(allOfRefDag20)).types([
	32841,
	"instantiations"
])

bench("allOf refs to rules(10)", () => jsonSchemaToType(allOfRefRules10)).types(
	[8691, "instantiations"]
)

bench("nested allOf unions(6)", () =>
	jsonSchemaToType(nestedAllOfUnions6)
).types([10477, "instantiations"])

// OpenAPI inheritance: a base oneOf its subtypes, each allOf the base
bench("inheritance oneOf(20)", () =>
	jsonSchemaToType(inheritanceOneOf20)
).types([11458, "instantiations"])

bench("jsonSchema", () =>
	jsonSchema({
		type: "object",
		properties: { a: { type: "string" }, b: { type: "number" } },
		required: ["a"]
	})
).types([258, "instantiations"])

bench("jsonSchema properties(50)", () => jsonSchema(properties50)).types([
	1839,
	"instantiations"
])

// inferring a generic schema from a contextual type walks every branch
bench("generic wrapper", () => {
	const wrap = <const s>(s: s): inferJsonSchema<s> => s as never
	const _: { a: string } = wrap({
		type: "object",
		properties: { a: { type: "string" } },
		required: ["a"]
	})
}).types([112896, "instantiations"])

bench("draft-07 $ref siblings", () =>
	jsonSchemaToType({
		$schema: "http://json-schema.org/draft-07/schema#",
		definitions: {
			name: { type: "string", minLength: 1 },
			age: { type: "integer", minimum: 0 },
			tags: { type: "array", items: { $ref: "#/definitions/name" } },
			person: {
				$id: "http://example.com/person",
				type: "object",
				properties: {
					name: { type: "string" },
					friend: { $ref: "#", description: "resolves against person" }
				},
				required: ["name"]
			}
		},
		type: "object",
		properties: {
			name: { $ref: "#/definitions/name", type: "number" },
			age: { $ref: "#/definitions/age", maximum: 10 },
			tags: { $ref: "#/definitions/tags", minItems: 1 },
			person: { $ref: "#/definitions/person", required: ["age"] }
		},
		required: ["name", "tags"]
	})
).types([1965, "instantiations"])

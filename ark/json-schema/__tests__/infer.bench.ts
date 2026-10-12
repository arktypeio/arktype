import { bench } from "@ark/attest"
import { jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import type { array } from "@ark/util"
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

// resolves every property type of an inferred object so lazily computed
// mapped types are counted
type force<t> =
	t extends array<infer element> ? force<element>
	: t extends object ? { [k in keyof t]: force<t[k]> }[keyof t]
	: t

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
	42,
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
).types([84, "instantiations"])

bench("type list", () =>
	jsonSchemaToType({ type: ["string", "number", "boolean"] })
).types([118, "instantiations"])

bench("const", () => jsonSchemaToType({ const: "nineteen characters" })).types([
	75,
	"instantiations"
])

bench("enum(10)", () =>
	jsonSchemaToType({ enum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] })
).types([123, "instantiations"])

bench("enum(100)", () => jsonSchemaToType(enum100)).types([
	198,
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
).types([222, "instantiations"])

bench("object literal (forced)", () => {
	const T = jsonSchemaToType({
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
	type _ = force<typeof T.infer>
}).types([3779, "instantiations"])

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
).types([106, "instantiations"])

bench("additionalProperties", () =>
	jsonSchemaToType({
		type: "object",
		properties: { a: { type: "string" } },
		required: ["a"],
		additionalProperties: { type: ["string", "number"] }
	})
).types([290, "instantiations"])

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
).types([740, "instantiations"])

bench("tuple (forced)", () => {
	const T = jsonSchemaToType({
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
	type _ = force<typeof T.infer>
}).types([4609, "instantiations"])

bench("anyOf(2)", () =>
	jsonSchemaToType({ anyOf: [{ type: "string" }, { type: "number" }] })
).types([98, "instantiations"])

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
).types([495, "instantiations"])

bench("if/then/else", () =>
	jsonSchemaToType({
		type: "object",
		properties: { kind: { enum: ["a", "b"] } },
		required: ["kind"],
		if: { properties: { kind: { const: "a" } } },
		then: { properties: { a: { type: "string" } }, required: ["a"] },
		else: { properties: { b: { type: "number" } }, required: ["b"] }
	})
).types([1105, "instantiations"])

bench("else-if chain(10)", () => jsonSchemaToType(elseIfChain10)).types([
	4764,
	"instantiations"
])

bench("allOf(30) objects", () => jsonSchemaToType(allOf30)).types([
	25184,
	"instantiations"
])

bench("nested tuples(10)", () => jsonSchemaToType(nestedTuples10)).types([
	1701,
	"instantiations"
])

bench("$ref", () =>
	jsonSchemaToType({
		$defs: { name: { type: "string" } },
		type: "object",
		properties: { first: { $ref: "#/$defs/name" } },
		required: ["first"]
	})
).types([228, "instantiations"])

bench("$ref cyclic", () =>
	jsonSchemaToType({
		type: "object",
		properties: {
			value: { type: "number" },
			children: { type: "array", items: { $ref: "#" } }
		},
		required: ["value"]
	})
).types([245, "instantiations"])

bench("properties(50)", () => jsonSchemaToType(properties50)).types([
	211,
	"instantiations"
])

bench("properties(50) (forced)", () => {
	const T = jsonSchemaToType(properties50)
	type _ = force<typeof T.infer>
}).types([6399, "instantiations"])

bench("properties(200)", () => jsonSchemaToType(properties200)).types([
	286,
	"instantiations"
])

bench("depth(10)", () => jsonSchemaToType(depth10)).types([
	659,
	"instantiations"
])

bench("depth(10) (forced)", () => {
	const T = jsonSchemaToType(depth10)
	type _ = force<typeof T.infer>
}).types([4845, "instantiations"])

bench("depth(40)", () => jsonSchemaToType(depth40)).types([
	2219,
	"instantiations"
])

bench("prefixItems(100)", () => jsonSchemaToType(prefixItems100)).types([
	6003,
	"instantiations"
])

bench("properties(100) refs", () => jsonSchemaToType(refProperties100)).types([
	5898,
	"instantiations"
])

bench("oneOf(10)", () => jsonSchemaToType(oneOf10)).types([
	1609,
	"instantiations"
])

bench("oneOf(10) (forced)", () => {
	const T = jsonSchemaToType(oneOf10)
	type _ = force<typeof T.infer>
}).types([9131, "instantiations"])

bench("oneOf(50)", () => jsonSchemaToType(oneOf50)).types([
	7369,
	"instantiations"
])

bench("oneOf(50) refs", () => jsonSchemaToType(oneOfRef50)).types([
	11200,
	"instantiations"
])

bench("draft-06 meta-schema", () => jsonSchemaToType(draft06MetaSchema)).types([
	1457,
	"instantiations"
])

bench("real-world oneOf", () => jsonSchemaToType(tamasfeOneOf)).types([
	1950,
	"instantiations"
])

bench("real-world oneOf (forced)", () => {
	const T = jsonSchemaToType(tamasfeOneOf)
	type _ = force<typeof T.infer>
}).types([13449, "instantiations"])

bench("s3 event", () => jsonSchemaToType(s3Event)).types([
	614,
	"instantiations"
])

// each definition is reached through two allOf paths
bench("allOf ref DAG(20)", () => jsonSchemaToType(allOfRefDag20)).types([
	26896,
	"instantiations"
])

bench("allOf refs to rules(10)", () => jsonSchemaToType(allOfRefRules10)).types(
	[8436, "instantiations"]
)

bench("nested allOf unions(6)", () =>
	jsonSchemaToType(nestedAllOfUnions6)
).types([10496, "instantiations"])

// OpenAPI inheritance: a base oneOf its subtypes, each allOf the base
bench("inheritance oneOf(20)", () =>
	jsonSchemaToType(inheritanceOneOf20)
).types([11106, "instantiations"])

bench("jsonSchema", () =>
	jsonSchema({
		type: "object",
		properties: { a: { type: "string" }, b: { type: "number" } },
		required: ["a"]
	})
).types([366, "instantiations"])

bench("jsonSchema properties(50)", () => jsonSchema(properties50)).types([
	376,
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
}).types([151671, "instantiations"])

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
).types([1484, "instantiations"])

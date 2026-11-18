import { attest, contextualize } from "@ark/attest"
import { Ajv } from "ajv"
import { Ajv2020 } from "ajv/dist/2020.js"
import { parse } from "arksets"

// ajv as the spec reads it: formats are annotations, and draft-07 ignores a $ref's siblings
const ajv2020 = new Ajv2020({ strict: false, validateFormats: false })
const ajv07 = new Ajv({
	strict: false,
	validateFormats: false,
	ignoreKeywordsWithRef: true
})

const astral = ["😀", "a😀b", "\uD83D", "\uDE00", "a\uD83D", "é"]

const values: unknown[] = [
	null,
	true,
	false,
	0,
	-1,
	1,
	1.5,
	2,
	3,
	4.5,
	5,
	6,
	10,
	-0.5,
	0.3,
	"",
	"a",
	"ab",
	"abc",
	"abcd",
	"b",
	"aaaaaaaaaa",
	"x@y.co",
	"2026-10-14",
	...astral,
	[],
	[1],
	["a"],
	[1, 2],
	[1, 1],
	["a", 1],
	[1, "a"],
	["a", "b", "c"],
	[1, 2, 3, 4],
	[{}],
	[{ a: 1 }, { a: 1 }],
	[[]],
	{},
	{ a: 1 },
	{ a: "x" },
	{ a: 1, b: 2 },
	{ a: "x", b: "y" },
	{ b: 2 },
	{ aa: 1 },
	{ ab: "x" },
	{ a: { a: 1 } },
	{ a: { a: { a: 1 } } },
	{ a: [1] },
	{ kind: "a" },
	{ kind: "b", n: 1 },
	{ "a/b": 1 }
]

const lengthSafeValues = values.filter(v => !astral.includes(v as string))

const disagreementsOf = (
	schema: object | boolean,
	data: unknown[]
): unknown[] => {
	const root = parse(schema)
	const validate =
		(
			typeof schema === "object" &&
			String((schema as { $schema?: string }).$schema).includes("draft-07")
		) ?
			ajv07.compile(schema)
		:	ajv2020.compile(schema)
	return data.filter(v => root.allows(v) !== validate(v))
}

const agreesOn = (data: unknown[], ...schemas: (object | boolean)[]) => {
	for (const schema of schemas) {
		attest({ schema, disagreements: disagreementsOf(schema, data) }).equals({
			schema,
			disagreements: []
		})
	}
}

const agrees = (...schemas: (object | boolean)[]) =>
	agreesOn(values, ...schemas)

contextualize(() => {
	it("boolean schemas", () => agrees(true, false, {}))

	it("type", () =>
		agrees(
			{ type: "string" },
			{ type: "number" },
			{ type: "integer" },
			{ type: "boolean" },
			{ type: "null" },
			{ type: "array" },
			{ type: "object" },
			{ type: ["string", "null"] },
			{ type: ["integer", "number"] },
			{ type: ["object", "array"] }
		))

	it("const and enum", () =>
		agrees(
			{ const: 1 },
			{ const: "a" },
			{ const: null },
			{ const: [1, "a"] },
			{ const: { a: 1 } },
			{ const: {} },
			{ const: [] },
			{ enum: [1, "a", null, { a: 1 }, [1, 1]] },
			{ type: "string", enum: ["a", 1] }
		))

	it("numbers", () =>
		agrees(
			{ minimum: 2 },
			{ exclusiveMinimum: 2 },
			{ maximum: 2 },
			{ exclusiveMaximum: 2 },
			{ type: "number", minimum: 1, exclusiveMinimum: 1 },
			{ type: "integer", maximum: 5 },
			{ multipleOf: 2 },
			{ type: "integer", multipleOf: 5 },
			{ multipleOf: 0.5 },
			{ multipleOf: 0.1 },
			{ type: "number", minimum: 5, maximum: 2 }
		))

	it("lengths", () =>
		agreesOn(
			lengthSafeValues,
			{ minLength: 2 },
			{ maxLength: 2 },
			{ type: "string", minLength: 1, maxLength: 3 }
		))

	it("patterns", () =>
		agrees(
			{ pattern: "a" },
			{ pattern: "^a+$" },
			{ type: "string", pattern: "^[a-c]{2}$" },
			{ pattern: "^.$" },
			{ pattern: "^[^a]$" },
			{ pattern: "^\\S$" },
			{ pattern: "^\\W$" },
			{ pattern: "^\\D+$" },
			{ pattern: "^\\u{1F600}$" },
			{ pattern: "^\\p{L}+$" },
			{ pattern: "^😀$" },
			{ pattern: "é" },
			{ pattern: "^[\\s\\S]$" },
			{ pattern: "^\\.$" },
			{ pattern: "^[.]$" }
		))

	it("arrays", () =>
		agrees(
			{ minItems: 2 },
			{ maxItems: 1 },
			{ items: { type: "number" } },
			{ items: false },
			{ prefixItems: [{ type: "number" }] },
			{ prefixItems: [{ type: "number" }, { type: "string" }], items: false },
			{ prefixItems: [{ type: "string" }], items: { type: "number" } },
			{ prefixItems: [false] },
			{ type: "array", prefixItems: [{}, {}], minItems: 1, maxItems: 3 },
			{ uniqueItems: true },
			{ contains: { type: "number" } },
			{ contains: { type: "number" }, minContains: 2 },
			{ contains: { type: "number" }, maxContains: 1 },
			{ contains: { type: "number" }, minContains: 0 }
		))

	it("objects", () =>
		agrees(
			{ properties: { a: { type: "number" } } },
			{ required: ["a"] },
			{ type: "object", required: ["a", "b"] },
			{ properties: { a: { type: "string" } }, required: ["a"] },
			{ properties: { a: { type: "number" } }, additionalProperties: false },
			{ required: ["b"], additionalProperties: false },
			{ additionalProperties: { type: "number" } },
			{
				properties: { a: { type: "number" } },
				additionalProperties: { type: "string" }
			},
			{ patternProperties: { "^a": { type: "number" } } },
			{
				patternProperties: { "^a": { type: "number" } },
				properties: { a: { type: "string" } }
			},
			{
				patternProperties: { "^a": { type: "number" } },
				additionalProperties: false
			},
			{ properties: { "a/b": { type: "string" } } },
			{ properties: { a: { properties: { a: { const: 1 } } } } },
			{ propertyNames: { maxLength: 1 } },
			{ propertyNames: false },
			{ minProperties: 1 },
			{ maxProperties: 1 },
			{ dependentRequired: { a: ["b"] } },
			{ dependentSchemas: { a: { required: ["b"] } } }
		))

	it("composition", () =>
		agrees(
			{ allOf: [{ type: "object" }, { required: ["a"] }] },
			{ allOf: [{ minimum: 1 }, { maximum: 3 }] },
			{ anyOf: [{ type: "string" }, { type: "number" }] },
			{ anyOf: [{ type: "object" }, { type: "array" }] },
			{ oneOf: [{ type: "string" }, { type: "number" }] },
			{ oneOf: [{ minimum: 2 }, { maximum: 4 }] },
			{ oneOf: [{ type: "string" }, { pattern: "^a" }] },
			{ not: { type: "string" } },
			{ not: { required: ["a"] } },
			{
				if: { type: "number" },
				then: { minimum: 3 },
				else: { type: "string" }
			},
			{ if: { required: ["kind"] }, then: { required: ["n"] } },
			{ then: { type: "string" } },
			{
				type: "number",
				anyOf: [{ minimum: 5 }, { maximum: 1 }],
				not: { const: 0 }
			}
		))

	it("refs", () =>
		agrees(
			{ $defs: { n: { type: "number" } }, $ref: "#/$defs/n" },
			{ $defs: { n: { type: "number" } }, $ref: "#/$defs/n", minimum: 3 },
			{
				$defs: {
					node: {
						type: "object",
						properties: { a: { $ref: "#/$defs/node" } }
					}
				},
				$ref: "#/$defs/node"
			},
			{
				anyOf: [{ type: "number" }, { type: "array", items: { $ref: "#" } }]
			},
			{
				properties: {
					"a/b": { type: "string" },
					c: { $ref: "#/properties/a~1b" }
				}
			}
		))

	it("draft-07", () =>
		agrees(
			{
				$schema: "http://json-schema.org/draft-07/schema#",
				items: [{ type: "number" }, { type: "number" }]
			},
			{
				$schema: "http://json-schema.org/draft-07/schema#",
				items: [{ type: "number" }],
				additionalItems: false
			},
			{
				$schema: "http://json-schema.org/draft-07/schema#",
				items: [{ type: "number" }],
				additionalItems: { type: "string" }
			},
			{
				$schema: "http://json-schema.org/draft-07/schema#",
				additionalItems: false
			},
			{
				$schema: "http://json-schema.org/draft-07/schema#",
				definitions: { s: { type: "string" } },
				properties: { a: { $ref: "#/definitions/s" } }
			},
			{
				$schema: "http://json-schema.org/draft-07/schema#",
				definitions: { n: { type: "number" } },
				$ref: "#/definitions/n",
				minimum: 3
			},
			{
				$schema: "http://json-schema.org/draft-07/schema#",
				dependencies: { a: ["b"], kind: { required: ["n"] } }
			}
		))

	it("annotations", () =>
		agrees(
			{ type: "string", format: "email" },
			{
				type: "number",
				title: "n",
				description: "a number",
				default: "x",
				examples: [1],
				deprecated: true,
				readOnly: true,
				$comment: "c"
			},
			{ "x-vendor": { minimum: 5 } }
		))
})

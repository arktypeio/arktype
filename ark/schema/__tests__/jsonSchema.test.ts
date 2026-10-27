import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	annotatingFallback,
	intrinsic,
	registeredReference,
	rootSchema,
	rootSchemaScope,
	schemaScope,
	type BaseRoot,
	type JsonSchema,
	type ToJsonSchema
} from "@ark/schema"
import type { omit } from "@ark/util"

const toJsonSchema = (
	node: BaseRoot,
	options?: omit<ToJsonSchema.Options, "dialect">
) => node.toJsonSchema({ dialect: null, ...options })

contextualize(() => {
	it("generates dialect by default", () => {
		const node = rootSchema("string")

		attest(node.toJsonSchema()).snap({
			type: "string",
			$schema: "https://json-schema.org/draft/2020-12/schema"
		})
	})

	it("base primitives", () => {
		attest(toJsonSchema(intrinsic.jsonPrimitive)).snap({
			anyOf: [
				{ type: "number" },
				{ type: "string" },
				{ type: "boolean" },
				{ type: "null" }
			]
		})
	})

	it("boolean", () => {
		attest(toJsonSchema($ark.intrinsic.boolean)).snap({
			type: "boolean"
		})
	})

	it("string", () => {
		const node = rootSchema({
			domain: "string",
			pattern: ".*",
			minLength: 1,
			maxLength: 2
		})
		attest(toJsonSchema(node)).snap({
			type: "string",
			pattern: ".*",
			maxLength: 2,
			minLength: 1
		})
	})

	it("number", () => {
		const node = rootSchema({
			domain: "number",
			divisor: 2,
			min: 1,
			max: 2
		})
		attest(toJsonSchema(node)).snap({
			type: "integer",
			multipleOf: 2,
			maximum: 2,
			minimum: 1
		})
	})

	it("exclusive range", () => {
		const node = rootSchema({
			domain: "number",
			min: { rule: 1, exclusive: true },
			max: { rule: 2, exclusive: true }
		})
		attest(toJsonSchema(node)).snap({
			type: "number",
			exclusiveMaximum: 2,
			exclusiveMinimum: 1
		})
	})

	it("string or symbol index", () => {
		const node = rootSchema({
			domain: "object",
			index: { signature: ["string", "symbol"], value: "number" }
		})
		attest(
			toJsonSchema(node, { fallback: { symbolKey: ctx => ctx.base } })
		).snap({ type: "object", additionalProperties: { type: "number" } })
	})

	it("pattern flags that don't change what it matches", () => {
		const node = rootSchema({
			domain: "string",
			pattern: [{ rule: "^.$", flags: "gu" }]
		})
		attest(toJsonSchema(node)).snap({ type: "string", pattern: "^.$" })
	})

	it("preserves meta", () => {
		const node = rootSchema({
			domain: "object",
			required: [
				{
					key: "foo",
					value: {
						domain: "string",
						meta: "a foo"
					}
				},
				{
					key: "bar",
					value: {
						domain: "number",
						meta: {
							title: "bar",
							examples: [1337, 7331]
						}
					}
				}
			],
			optional: {
				key: "baz",
				value: { "meta.deprecated": true, unit: 1 }
			}
		})

		const jsonSchema = toJsonSchema(node)

		attest(jsonSchema).snap({
			type: "object",
			properties: {
				bar: { type: "number", title: "bar", examples: [1337, 7331] },
				foo: { type: "string", description: "a foo" },
				baz: { type: "number", const: 1, deprecated: true }
			},
			required: ["bar", "foo"]
		})
	})

	it("cyclic", () => {
		// JSON Schema can't require a plain object
		const schema = toJsonSchema($ark.intrinsic.jsonObject, {
			fallback: { predicate: ctx => ctx.base }
		})

		attest(schema).snap({
			type: "object",
			additionalProperties: { $ref: "#/$defs/jsonData" },
			$defs: {
				jsonData: {
					anyOf: [
						{ type: "number" },
						{ type: "string" },
						{
							type: "object",
							additionalProperties: { $ref: "#/$defs/jsonData" }
						},
						{ type: "boolean" },
						{ type: "null" }
					]
				}
			}
		})
	})

	it("toJsonSchemaRecurse", () => {
		const node = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }]
		})
		const ctx = node.$.cfg.toJsonSchema
		attest(node.toJsonSchemaRecurse(ctx)).snap({
			type: "object",
			properties: { a: { type: "string" } },
			required: ["a"]
		})
		attest(node.toJsonSchemaRecurse({ ...ctx, useRefs: true })).equals({
			$ref: "#/$defs/intersection"
		})
		attest(
			rootSchema("string").toJsonSchemaRecurse({ ...ctx, useRefs: true })
		).equals({ type: "string" })
	})

	it("$defs in reference order", () => {
		const node = rootSchema([
			{
				domain: "object",
				required: [
					{ key: "k", value: { unit: "a" } },
					{
						key: "a",
						value: {
							domain: "object",
							required: [{ key: "x", value: "string" }]
						}
					}
				]
			},
			{
				domain: "object",
				required: [
					{ key: "k", value: { unit: "b" } },
					{
						key: "b",
						value: {
							domain: "object",
							required: [{ key: "y", value: "number" }]
						}
					}
				]
			}
		])
		const defs = toJsonSchema(node, { useRefs: true }).$defs!
		attest(
			Object.values(defs).map(def =>
				Object.keys((def as JsonSchema.Object).properties ?? def)
			)
		).snap([["anyOf"], ["a", "k"], ["x"], ["b", "k"], ["y"]])
	})

	it("includes default for object prop", () => {
		const T = rootSchema({
			domain: "object",
			optional: [{ key: "foo", value: "Array", default: () => [] }]
		})
		attest(toJsonSchema(T)).snap({
			type: "object",
			properties: { foo: { type: "array", default: [] } }
		})
	})

	it("it includes primitive default for tuple", () => {
		const T = rootSchema({
			proto: "Array",
			sequence: {
				prefix: ["number"],
				defaultables: [["string", ""]],
				optionals: ["string"]
			}
		})

		attest(toJsonSchema(T)).snap({
			type: "array",
			minItems: 1,
			prefixItems: [
				{ type: "number" },
				{ type: "string", default: "" },
				{ type: "string" }
			],
			items: false
		})
	})

	it("includes object default from meta", () => {
		const T = rootSchema({
			proto: "Array",
			sequence: "number",
			meta: { default: [5] }
		})

		attest(toJsonSchema(T)).snap({
			type: "array",
			items: { type: "number" },
			default: [5]
		})
	})

	describe("unjsonifiable", () => {
		it("arrayObject", () => {
			const T = rootSchema({
				proto: "Array",
				sequence: {
					variadic: "number"
				},
				required: [{ key: "extra", value: "string" }]
			})

			attest(() => T.toJsonSchema()).throws
				.snap(`ToJsonSchemaError: Can't convert "arrayObject" to JSON Schema. Configure fallback.arrayObject to write it:
{
    code: "arrayObject",
    base: {
        type: "array",
        items: {
            type: "number"
        }
    },
    object: {
        type: "object",
        properties: {
            extra: {
                type: "string"
            }
        },
        required: [
            "extra"
        ]
    }
}`)
		})

		it("arrayPostfix", () => {
			const T = rootSchema({
				proto: "Array",
				sequence: {
					variadic: "number",
					postfix: ["string"]
				}
			})

			attest(() => T.toJsonSchema()).throws
				.snap(`ToJsonSchemaError: Can't convert "arrayPostfix" to JSON Schema. Configure fallback.arrayPostfix to write it:
{
    code: "arrayPostfix",
    base: {
        type: "array",
        minItems: 1,
        items: {
            type: "number"
        }
    },
    elements: [
        {
            type: "string"
        }
    ]
}`)
		})

		it("default", () => {
			const T = rootSchema({
				domain: "object",
				optional: [
					{
						key: "foo",
						value: {},
						default: 0n
					}
				]
			})

			attest(() => T.toJsonSchema()).throws
				.snap(`ToJsonSchemaError: Can't convert "defaultValue" at foo to JSON Schema. Configure fallback.defaultValue to write it:
{
    code: "defaultValue",
    base: {},
    value: 0n
}`)
		})

		it("meta default", () => {
			const T = rootSchema({
				domain: "object",
				meta: { default: { a: 0n } }
			})

			attest(() => T.toJsonSchema()).throws
				.snap(`ToJsonSchemaError: Can't convert "defaultValue" to JSON Schema. Configure fallback.defaultValue to write it:
{
    code: "defaultValue",
    base: {
        type: "object",
        properties: {}
    },
    value: {
        a: 0n
    }
}`)
		})

		it("meta function default", () => {
			const T = rootSchema({
				domain: "object",
				meta: { default: () => ({}) }
			})

			attest(() => T.toJsonSchema()).throws("defaultValue")
		})

		it("domain", () => {
			const T = rootSchema("bigint")

			attest(() => T.toJsonSchema()).throws
				.snap(`ToJsonSchemaError: Can't convert "domain" to JSON Schema. Configure fallback.domain to write it:
{
    code: "domain",
    base: {},
    domain: "bigint"
}`)
		})

		it("morph", () => {
			const T = rootSchema({
				in: "string",
				morphs: [(s: string) => Number.parseInt(s)]
			})

			attest(() => T.toJsonSchema()).throws
				.snap(`ToJsonSchemaError: Can't convert "morph" to JSON Schema. Configure fallback.morph to write it:
{
    code: "morph",
    base: {
        type: "string"
    },
    out: null
}`)
		})

		it("indexKey", () => {
			const T = rootSchema({
				domain: "object",
				required: [{ key: "abcd", value: "string" }],
				index: {
					signature: { domain: "string", maxLength: 3 },
					value: "number"
				},
				undeclared: "reject"
			})

			attest(() => T.toJsonSchema()).throws
				.snap(`ToJsonSchemaError: Can't convert "indexKey" to JSON Schema. Configure fallback.indexKey to write it:
{
    code: "indexKey",
    base: {
        type: "object",
        properties: {
            abcd: {
                type: "string"
            }
        },
        required: [
            "abcd"
        ],
        additionalProperties: false
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

		it("patternIntersection", () => {
			const T = rootSchema({
				domain: "string",
				pattern: ["^a", "z$"]
			})

			attest(() => T.toJsonSchema()).throws
				.snap(`ToJsonSchemaError: Can't convert "patternIntersection" to JSON Schema. Configure fallback.patternIntersection to write it:
{
    code: "patternIntersection",
    base: {
        type: "string",
        pattern: "^a"
    },
    pattern: "z$"
}`)
		})

		it("patternFlags", () => {
			const T = rootSchema({
				domain: "string",
				pattern: [{ rule: "^a", flags: "i" }]
			})

			attest(() => T.toJsonSchema()).throws
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

		it("patternFlags with u in draft-07", () => {
			const T = rootSchema({
				domain: "string",
				pattern: [{ rule: "^.$", flags: "u" }]
			})

			attest(() => T.toJsonSchema({ target: "draft-07" })).throws
				.snap(`ToJsonSchemaError: Can't convert "patternFlags" to JSON Schema. Configure fallback.patternFlags to write it:
{
    code: "patternFlags",
    base: {
        type: "string"
    },
    pattern: "^.$",
    flags: "u"
}`)
		})

		it("predicate", () => {
			const T = rootSchema({
				domain: "string",
				predicate: function _toJsonSchemaPredicate() {
					return true
				}
			})

			attest(() => T.toJsonSchema()).throws
				.snap(`ToJsonSchemaError: Can't convert "predicate" to JSON Schema. Configure fallback.predicate to write it:
{
    code: "predicate",
    base: {
        type: "string"
    },
    predicate: Function(_toJsonSchemaPredicate)
}`)
		})

		it("proto", () => {
			const T = rootSchema({
				proto: Map
			})

			attest(() => T.toJsonSchema()).throws
				.snap(`ToJsonSchemaError: Can't convert "proto" to JSON Schema. Configure fallback.proto to write it:
{
    code: "proto",
    base: {},
    proto: Function(Map)
}`)
		})

		it("symbolKey", () => {
			const T = rootSchema({
				domain: "object",
				required: [{ key: Symbol("zildjian"), value: "string" }]
			})

			attest(() => T.toJsonSchema()).throws
				.snap(`ToJsonSchemaError: Can't convert "symbolKey" at [Symbol(zildjian)] to JSON Schema. Configure fallback.symbolKey to write it:
{
    code: "symbolKey",
    base: {
        type: "object",
        properties: {}
    },
    key: Symbol(zildjian),
    value: {
        type: "string"
    },
    optional: false
}`)
		})

		it("unit", () => {
			const T = rootSchema({ unit: undefined })

			attest(() => T.toJsonSchema()).throws
				.snap(`ToJsonSchemaError: Can't convert "unit" to JSON Schema. Configure fallback.unit to write it:
{
    code: "unit",
    base: {},
    unit: undefined
}`)
		})

		it("after", () => {
			const T = rootSchema({
				proto: "Date",
				after: new Date("01-01-2000")
			})

			attest(() =>
				T.toJsonSchema({
					fallback: {
						proto: () => ({ type: "object" })
					}
				})
			).throws
				.snap(`ToJsonSchemaError: Can't convert "date" to JSON Schema. Configure fallback.date to write it:
{
    code: "date",
    base: {}
}`)
		})
	})

	describe("annotatingFallback", () => {
		// x-arktype-* keywords aren't part of the JsonSchema type
		const annotated = (T: BaseRoot): object =>
			toJsonSchema(T, { fallback: annotatingFallback })

		it("predicates", () => {
			const isEven = (n: number) => n % 2 === 0
			const isPositive = (n: number) => n > 0
			const T = rootSchema({
				domain: "number",
				predicate: [isEven, isPositive]
			})

			attest(annotated(T)).snap({
				type: "number",
				"x-arktype-predicates": [
					registeredReference(isEven),
					registeredReference(isPositive)
				]
			})
		})

		it("bigint, undefined and Map", () => {
			attest(annotated(rootSchema("bigint"))).snap({
				"x-arktype-domain": "bigint"
			})
			attest(annotated(rootSchema({ unit: undefined }))).snap({
				"x-arktype-unit": "undefined"
			})
			attest(annotated(rootSchema({ proto: Map }))).snap({
				"x-arktype-proto": "Map"
			})
		})

		it("morph", () => {
			const T = rootSchema({
				in: "string",
				morphs: [(s: string) => Number.parseInt(s)]
			})

			attest(annotated(T)).snap({ type: "string", "x-arktype-out": null })
		})

		it("patterns", () => {
			const T = rootSchema({
				domain: "string",
				pattern: ["^a", "z$", "m"]
			})

			attest(annotated(T)).snap({
				type: "string",
				pattern: "^a",
				allOf: [{ pattern: "m" }, { pattern: "z$" }]
			})
		})

		it("pattern flags", () => {
			const T = rootSchema({
				domain: "string",
				pattern: ["z$", { rule: "^a", flags: "i" }]
			})

			attest(annotated(T)).snap({
				type: "string",
				"x-arktype-patterns": [{ rule: "^a", flags: "i" }],
				pattern: "z$"
			})
		})

		it("index key", () => {
			const T = rootSchema({
				domain: "object",
				index: {
					signature: { domain: "string", maxLength: 3 },
					value: "number"
				}
			})

			attest(annotated(T)).snap({
				type: "object",
				"x-arktype-index": [
					{ key: { type: "string", maxLength: 3 }, value: { type: "number" } }
				]
			})
		})

		it("symbol keys", () => {
			const zildjian = Symbol("zildjian")
			const T = rootSchema({
				domain: "object",
				required: [
					{ key: "name", value: "string" },
					{ key: zildjian, value: "number" }
				],
				index: [{ signature: "symbol", value: "number" }]
			})

			attest(annotated(T)).snap({
				type: "object",
				properties: { name: { type: "string" } },
				"x-arktype-symbolKeys": [
					{
						key: registeredReference(zildjian),
						value: { type: "number" },
						optional: false
					},
					{ key: null, value: { type: "number" }, optional: false }
				],
				required: ["name"]
			})
		})

		it("date range", () => {
			const T = rootSchema({
				proto: "Date",
				after: new Date("2000-01-01T00:00:00.000Z"),
				before: new Date("2000-06-01T00:00:00.000Z")
			})

			attest(annotated(T)).snap({
				"x-arktype-proto": "Date",
				"x-arktype-before": "2000-06-01T00:00:00.000Z",
				"x-arktype-after": "2000-01-01T00:00:00.000Z"
			})
		})

		it("postfix and array props", () => {
			const T = rootSchema({
				proto: "Array",
				sequence: {
					variadic: "number",
					postfix: ["string"]
				},
				required: [{ key: "extra", value: "string" }]
			})

			attest(annotated(T)).snap({
				type: "array",
				minItems: 1,
				items: { type: "number" },
				"x-arktype-postfix": [{ type: "string" }],
				"x-arktype-object": {
					type: "object",
					properties: { extra: { type: "string" } },
					required: ["extra"]
				}
			})
		})

		it("default", () => {
			const T = rootSchema({
				domain: "object",
				optional: [{ key: "foo", value: {}, default: 0n }]
			})

			attest(annotated(T)).snap({
				type: "object",
				properties: { foo: { default: "0n" } }
			})
		})
	})

	describe("fallbacks", () => {
		it("morph falls back to in", () => {
			const T = rootSchema({
				in: "string",
				morphs: [(s: string) => Number.parseInt(s)]
			})

			const schema = toJsonSchema(T, {
				fallback: {
					morph: ctx => ({ ...ctx.base, _testOut: ctx.out })
				}
			})

			attest(schema).unknown.snap({ type: "string", _testOut: null })
		})

		it("introspectable out", () => {
			const T = rootSchema({
				in: "string",
				morphs: [(s: string) => Number.parseInt(s), rootSchema("number")]
			})

			const schema = toJsonSchema(T, {
				fallback: {
					morph: ctx => ({ ...ctx.out, _testIn: ctx.base }) as never
				}
			})

			attest(schema).unknown.snap({
				type: "number",
				_testIn: { type: "string" }
			})
		})

		it("morph index key", () => {
			const T = rootSchema({
				domain: "object",
				index: [
					{
						signature: {
							in: { domain: "string", pattern: "^\\d+$" },
							morphs: [(s: string) => Number.parseInt(s)]
						},
						value: "string"
					},
					{
						signature: {
							in: { domain: "string", meta: "a key" },
							morphs: [(s: string) => s.trim()]
						},
						value: "number"
					}
				]
			})

			const expected: JsonSchema = {
				type: "object",
				patternProperties: {
					"": { type: "number" },
					"^\\d+$": { type: "string" }
				}
			}

			attest(toJsonSchema(T, { fallback: { morph: ctx => ctx.base } })).equals(
				expected
			)
			attest(
				toJsonSchema(T, { fallback: { morph: ctx => ctx.out ?? ctx.base } })
			).equals(expected)
			attest(
				toJsonSchema(T, { useRefs: true, fallback: { morph: ctx => ctx.base } })
					.$defs!.intersection
			).equals(expected)
		})

		it("date supercedes proto", () => {
			const T = rootSchema({
				proto: "Date"
			})

			const schema = toJsonSchema(T, {
				fallback: {
					proto: () => ({ type: "object" }),
					date: () => ({
						type: "string",
						format: "date-time"
					})
				}
			})

			attest(schema).snap({ type: "string", format: "date-time" })
		})

		it("scope config", () => {
			const zildjian = Symbol()
			const { T } = schemaScope(
				{
					T: rootSchema({
						domain: "object",
						required: [
							{ key: zildjian, value: "string" },
							{ key: "valid", value: "bigint" }
						]
					})
				},
				{
					toJsonSchema: {
						fallback: ctx => ctx.base
					}
				}
			).export()

			const schema = toJsonSchema(T)

			attest(schema).snap({
				type: "object",
				properties: { valid: {} },
				required: ["valid"]
			})
		})

		it("default fallback precedence", () => {
			const { T } = schemaScope(
				{
					T: rootSchema({
						domain: "object",
						required: [
							{ key: "valid", value: "bigint" },
							{
								key: "patterns",
								value: { domain: "string", pattern: ["^a", "z$"] }
							}
						]
					})
				},
				{
					toJsonSchema: {
						fallback: {
							default: ctx => ({ ...ctx.base, description: "defaulted" }),
							domain: ctx => ({ ...ctx.base, description: "domain" })
						}
					}
				}
			).export()

			const schema = toJsonSchema(T)

			attest(schema).snap({
				type: "object",
				properties: {
					patterns: { type: "string", pattern: "^a", description: "defaulted" },
					valid: { description: "domain" }
				},
				required: ["patterns", "valid"]
			})
		})
	})
})

import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	intrinsic,
	rootSchema,
	rootSchemaScope,
	type BaseRoot
} from "@ark/schema"

const toJsonSchema = (node: BaseRoot) => node.toJsonSchema({ dialect: null })

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
				// boolean is special-cased to merge during conversion
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

	it("object", () => {
		const node = rootSchema({
			domain: "object",
			required: [
				{
					key: "foo",
					value: "string"
				},
				{ key: "bar", value: "number" }
			],
			optional: [
				{
					key: "baz",
					value: { unit: 1 }
				}
			],
			index: {
				signature: "string",
				value: $ark.intrinsic.jsonPrimitive
			}
		})
		attest(toJsonSchema(node)).snap({
			type: "object",
			properties: {
				bar: { type: "number" },
				foo: { type: "string" },
				baz: { const: 1 }
			},
			required: ["bar", "foo"],
			additionalProperties: {
				anyOf: [
					{ type: "number" },
					{ type: "string" },
					{ type: "boolean" },
					{ type: "null" }
				]
			}
		})
	})

	it("pattern index", () => {
		const node = rootSchema({
			domain: "object",
			index: {
				signature: {
					domain: "string",
					pattern: ".*"
				},
				value: "number"
			}
		})
		attest(toJsonSchema(node)).snap({
			type: "object",
			patternProperties: { ".*": { type: "number" } }
		})
	})

	it("variadic array", () => {
		const node = rootSchema({
			proto: Array,
			sequence: { domain: "string" },
			minLength: 1,
			maxLength: 5
		})
		const jsonSchema = toJsonSchema(node)
		attest(jsonSchema).snap({
			type: "array",
			items: { type: "string" },
			minItems: 1,
			maxItems: 5
		})
	})

	it("fixed length tuple", () => {
		const node = rootSchema({
			proto: Array,
			sequence: {
				prefix: [{ domain: "string" }, { domain: "number" }]
			}
		})
		const jsonSchema = toJsonSchema(node)
		attest(jsonSchema).snap({
			type: "array",
			minItems: 2,
			prefixItems: [{ type: "string" }, { type: "number" }],
			items: false
		})
	})

	it("prefixed array", () => {
		const node = rootSchema({
			proto: Array,
			sequence: {
				prefix: [{ domain: "string" }, { domain: "number" }],
				variadic: { unit: 1 }
			}
		})
		const jsonSchema = toJsonSchema(node)
		attest(jsonSchema).snap({
			type: "array",
			minItems: 2,
			prefixItems: [{ type: "string" }, { type: "number" }],
			items: { const: 1 }
		})
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
				baz: { const: 1, deprecated: true }
			},
			required: ["bar", "foo"]
		})
	})

	it("cyclic", () => {
		const schema = toJsonSchema($ark.intrinsic.jsonObject)

		attest(schema).snap({
			$ref: "#/$defs/intersection11",
			$defs: {
				intersection11: {
					type: "object",
					additionalProperties: { $ref: "#/$defs/jsonData1" }
				},
				jsonData1: {
					anyOf: [
						{ $ref: "#/$defs/alias1" },
						{ type: "number" },
						{ type: "string" },
						{ $ref: "#/$defs/boolean1" },
						{ type: "null" }
					]
				},
				alias1: { $ref: "#/$defs/alias1" },
				union7: {
					anyOf: [{ $ref: "#/$defs/alias1" }, { $ref: "#/$defs/boolean1" }]
				}
			}
		})
	})

	// https://github.com/arktypeio/arktype/issues/1328
	it("unions of literal values as enums", () => {
		const Bit = rootSchemaScope.units([0, 1])

		attest(toJsonSchema(Bit)).snap({ enum: [0, 1] })
	})

	it("unions of literal values with metadata not enums", () => {
		const Bit = rootSchema([
			{ unit: 0 },
			{ unit: 1, "meta.description": "one" }
		])

		attest(toJsonSchema(Bit)).snap({
			anyOf: [{ const: 0 }, { const: 1, description: "one" }]
		})
	})

	it("includes default for primitive prop", () => {
		const T = rootSchema({
			domain: "object",
			optional: [{ key: "foo", value: "number", default: 0 }]
		})
		attest(toJsonSchema(T)).snap({
			type: "object",
			properties: { foo: { type: "number", default: 0 } }
		})
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

	it("it includes object default for tuple", () => {
		const T = rootSchema({
			proto: "Array",
			sequence: {
				defaultables: [["Array", () => []]]
			}
		})

		attest(toJsonSchema(T)).snap({
			type: "array",
			prefixItems: [{ type: "array", default: [] }],
			items: false
		})
	})

	it("null generated as type instead of const", () => {
		const T = rootSchema({ unit: null })

		attest(toJsonSchema(T)).snap({ type: "null" })
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

			attest(() => T.toJsonSchema()).throws.snap(`ToJsonSchemaError: {
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

			attest(() => T.toJsonSchema()).throws.snap(`ToJsonSchemaError: {
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

			attest(() => T.toJsonSchema()).throws.snap(`ToJsonSchemaError: {
    code: "default",
    base: {},
    value: 0n
}`)
		})

		it("functional default", () => {
			const T = rootSchema({
				domain: "object",
				optional: [
					{
						key: "foo",
						value: {},
						default: () => 0n
					}
				]
			})

			attest(() => T.toJsonSchema()).throws.snap(`ToJsonSchemaError: {
    code: "default",
    base: {},
    value: 0n
}`)
		})

		it("domain", () => {
			const T = rootSchema("bigint")

			attest(() => T.toJsonSchema()).throws.snap(`ToJsonSchemaError: {
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

			attest(() => T.toJsonSchema()).throws.snap(`ToJsonSchemaError: {
    code: "morph",
    base: {
        type: "string",
        $schema: "https://json-schema.org/draft/2020-12/schema"
    },
    out: null
}`)
		})

		it("patternIntersection", () => {
			const T = rootSchema({
				domain: "string",
				pattern: ["^a", "z$"]
			})

			attest(() => T.toJsonSchema()).throws.snap(`ToJsonSchemaError: {
    code: "patternIntersection",
    base: {
        type: "string",
        pattern: "^a"
    },
    pattern: "z$"
}`)
		})

		it("predicate", () => {
			const T = rootSchema({
				domain: "string",
				predicate: () => true
			})

			attest(() => T.toJsonSchema()).throws.snap(`ToJsonSchemaError: {
    code: "predicate",
    base: {
        type: "string"
    },
    predicate: Function(predicate5)
}`)
		})

		it("proto", () => {
			const T = rootSchema({
				proto: Map
			})

			attest(() => T.toJsonSchema()).throws.snap(`ToJsonSchemaError: {
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

			attest(() => T.toJsonSchema()).throws.snap(
				"TypeError: Cannot convert a Symbol value to a string"
			)
		})

		it("unit", () => {
			const T = rootSchema({ unit: undefined })

			attest(() => T.toJsonSchema()).throws.snap(`ToJsonSchemaError: {
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
			).throws.snap(`ToJsonSchemaError: {
    code: "date",
    base: {}
}`)
		})

		it("before", () => {
			const T = rootSchema({
				proto: "Date",
				before: new Date("06-01-2000")
			})

			attest(() =>
				T.toJsonSchema({
					fallback: {
						proto: () => ({ type: "object" })
					}
				})
			).throws.snap(`ToJsonSchemaError: {
    code: "date",
    base: {}
}`)
		})
	})

	describe("fallbacks", () => {
		it("morph falls back to in", () => {
			const T = rootSchema({
				in: "string",
				morphs: [(s: string) => Number.parseInt(s)]
			})

			const schema = T.toJsonSchema({
				fallback: {
					morph: ctx => ({ ...ctx.base, _testOut: ctx.out })
				}
			})

			attest(schema).unknown.snap({
				type: "string",
				$schema: "https://json-schema.org/draft/2020-12/schema",
				_testOut: null
			})
		})

		it("introspectable out", () => {
			const T = rootSchema({
				in: "string",
				morphs: [(s: string) => Number.parseInt(s), rootSchema("number")]
			})

			const schema = T.toJsonSchema({
				fallback: {
					morph: ctx => ({ ...ctx.out, _testIn: ctx.base }) as never
				}
			})

			attest(schema).unknown.snap({
				type: "number",
				$schema: "https://json-schema.org/draft/2020-12/schema",
				_testIn: {
					type: "string",
					$schema: "https://json-schema.org/draft/2020-12/schema"
				}
			})
		})

		it("date supercedes proto", () => {
			const T = rootSchema({
				proto: "Date"
			})

			const schema = T.toJsonSchema({
				fallback: {
					proto: () => ({ type: "object" }),
					date: () => ({
						type: "string",
						format: "date-time"
					})
				}
			})

			attest(schema).snap({
				type: "string",
				format: "date-time",
				$schema: "https://json-schema.org/draft/2020-12/schema"
			})
		})

		it("date range with fallback", () => {
			const T = rootSchema({
				proto: "Date",
				before: new Date("06-01-2000")
			})

			const schema = T.toJsonSchema({
				fallback: {
					proto: () => ({ type: "object" }),
					date: ctx => ({
						type: "string",
						format: "date-time",
						description: `before ${ctx.before?.toISOString()}`
					})
				}
			})

			attest(schema).snap({
				type: "string",
				format: "date-time",
				description: "before 2000-06-01T04:00:00.000Z",
				$schema: "https://json-schema.org/draft/2020-12/schema"
			})
		})
	})
})

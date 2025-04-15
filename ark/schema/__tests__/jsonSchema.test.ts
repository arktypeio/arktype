import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	intrinsic,
	rootSchema,
	rootSchemaScope,
	ToJsonSchema,
	type BaseRoot
} from "@ark/schema"
import { throwInternalError } from "@ark/util"

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

	it("errors on morph", () => {
		const morph = rootSchema({
			in: "string",
			morphs: [(s: string) => Number.parseInt(s)]
		})

		attest(() => toJsonSchema(morph)).throws(
			ToJsonSchema.writeMessage(morph.expression, "morph")
		)
	})

	it("errors on cyclic", () => {
		attest(() => toJsonSchema($ark.intrinsic.jsonObject)).throws(
			ToJsonSchema.writeMessage("jsonObject", "cyclic")
		)
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

	it("constrained date", () => {
		throwInternalError("unimplemented")
	})

	describe("unjsonifiable", () => {
		// 		arrayObject: ctx => ToJsonSchema.throw("arrayObject", ctx),
		// arrayPostfix: ctx => ToJsonSchema.throw("arrayPostfix", ctx),
		// default: ctx => ToJsonSchema.throw("default", ctx),
		// domain: ctx => ToJsonSchema.throw("domain", ctx),
		// morph: ctx => ToJsonSchema.throw("morph", ctx),
		// patternIntersection: ctx =>
		// 	ToJsonSchema.throw("patternIntersection", ctx),
		// predicate: ctx => ToJsonSchema.throw("predicate", ctx),
		// proto: ctx => ToJsonSchema.throw("proto", ctx),
		// symbolKey: ctx => ToJsonSchema.throw("symbolKey", ctx),
		// unit: ctx => ToJsonSchema.throw("unit", ctx)

		it("arrayObject", () => {
			const T = rootSchema({
				proto: "Array",
				sequence: {
					variadic: "number"
				},
				required: [{ key: "extra", value: "string" }]
			})

			attest(() => T.toJsonSchema()).throws.snap()
		})

		it("arrayPostfix", () => {
			const T = rootSchema({
				proto: "Array",
				sequence: {
					variadic: "number",
					postfix: ["string"]
				}
			})

			attest(() => T.toJsonSchema()).throws.snap()
		})

		it("default", () => {
			const T = rootSchema({
				domain: "object",
				optional: [
					{
						key: "foo",
						value: "bigint",
						default: 0n
					}
				]
			})

			attest(() => T.toJsonSchema()).throws.snap()
		})

		it("functional default", () => {
			const T = rootSchema({
				domain: "object",
				optional: [
					{
						key: "foo",
						value: "bigint",
						default: () => 0n
					}
				]
			})

			attest(() => T.toJsonSchema()).throws.snap()
		})

		it("domain", () => {
			const T = rootSchema("bigint")

			attest(() => T.toJsonSchema()).throws.snap()
		})

		it("index", () => {
			const T = rootSchema({})

			attest(() => T.toJsonSchema()).throws.snap()
		})
	})
})

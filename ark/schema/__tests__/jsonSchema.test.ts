import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	intrinsic,
	JsonSchema,
	rootSchema,
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
				{ const: null }
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
					{ const: null }
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
			JsonSchema.writeUnjsonifiableMessage(morph.expression, "morph")
		)
	})

	it("errors on cyclic", () => {
		attest(() => toJsonSchema($ark.intrinsic.jsonObject)).throws(
			JsonSchema.writeUnjsonifiableMessage("jsonObject", "cyclic")
		)
	})
})

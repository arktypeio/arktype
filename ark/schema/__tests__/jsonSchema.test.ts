import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	intrinsic,
	rootNode,
	writeCyclicJsonSchemaMessage,
	writeJsonSchemaMorphMessage
} from "@ark/schema"

contextualize(() => {
	it("base primitives", () => {
		attest(intrinsic.jsonPrimitive.toJsonSchema()).snap({
			anyOf: [
				{ type: "number" },
				{ type: "string" },
				{ type: "boolean" },
				{ const: null }
			]
		})
	})

	it("string", () => {
		const node = rootNode({
			domain: "string",
			pattern: ".*",
			minLength: 1,
			maxLength: 2
		})
		attest(node.toJsonSchema()).snap({
			type: "string",
			pattern: ".*",
			maxLength: 2,
			minLength: 1
		})
	})

	it("number", () => {
		const node = rootNode({
			domain: "number",
			divisor: 2,
			min: 1,
			max: 2
		})
		attest(node.toJsonSchema()).snap({
			type: "integer",
			multipleOf: 2,
			maximum: 2,
			minimum: 1
		})
	})

	it("exclusive range", () => {
		const node = rootNode({
			domain: "number",
			min: { rule: 1, exclusive: true },
			max: { rule: 2, exclusive: true }
		})
		attest(node.toJsonSchema()).snap({
			type: "number",
			exclusiveMaximum: 2,
			exclusiveMinimum: 1
		})
	})

	it("object", () => {
		const node = rootNode({
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
		attest(node.toJsonSchema()).snap({
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
		const node = rootNode({
			domain: "object",
			index: {
				signature: {
					domain: "string",
					pattern: ".*"
				},
				value: "number"
			}
		})
		attest(node.toJsonSchema()).snap({
			type: "object",
			patternProperties: { ".*": { type: "number" } }
		})
	})

	it("errors on morph", () => {
		const morph = rootNode({
			in: "string",
			morphs: [(s: string) => Number.parseInt(s)]
		})

		attest(() => morph.toJsonSchema()).throws(
			writeJsonSchemaMorphMessage(morph.expression)
		)
	})

	it("errors on cyclic", () => {
		attest(() => $ark.intrinsic.json.toJsonSchema()).throws(
			writeCyclicJsonSchemaMessage("jsonObject")
		)
	})
})

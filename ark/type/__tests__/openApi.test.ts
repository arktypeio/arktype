import { attest, contextualize } from "@ark/attest"
import {
	annotatingFallback,
	writeInvalidJsonSchemaTargetMessage,
	type JsonSchema,
	type ToJsonSchema
} from "@ark/schema"
import { scope, type } from "arktype"

const target = "openapi-3.0"

// the approximation zod, valibot and sury write for a tuple
const anyOfPrefix = ({
	base,
	elements,
	items
}: ToJsonSchema.ArrayPrefixContext): JsonSchema.Array => ({
	...base,
	items: { anyOf: items ? [...elements, items] : elements }
})

// nullable and example aren't part of the JsonSchema type
const toOpenApi = (
	t: { toJsonSchema: (opts: ToJsonSchema.Options) => JsonSchema },
	opts?: ToJsonSchema.Options
): object => t.toJsonSchema({ ...opts, target })

contextualize(() => {
	it("exclusive bounds", () => {
		attest(toOpenApi(type("0 < number < 10"))).snap({
			type: "number",
			maximum: 10,
			exclusiveMaximum: true,
			minimum: 0,
			exclusiveMinimum: true
		})
	})

	it("units", () => {
		attest(toOpenApi(type("'cat'"))).snap({
			type: "string",
			enum: ["cat"]
		})
		attest(toOpenApi(type("'a' | 'b'"))).snap({
			type: "string",
			enum: ["a", "b"]
		})
		attest(toOpenApi(type("'a' | 1"))).snap({ enum: ["a", 1] })
	})

	it("null", () => {
		attest(toOpenApi(type("null"))).snap({
			type: "string",
			nullable: true,
			enum: [null]
		})
	})

	it("nullable", () => {
		attest(toOpenApi(type("string | null"))).snap({
			type: "string",
			nullable: true
		})
		attest(toOpenApi(type({ a: "string" }).or("null"))).snap({
			type: "object",
			properties: { a: { type: "string" } },
			required: ["a"],
			nullable: true
		})
	})

	it("nullable units", () => {
		attest(toOpenApi(type("'a' | 'b' | null"))).snap({
			type: "string",
			enum: ["a", "b", null],
			nullable: true
		})
		attest(toOpenApi(type("boolean | null"))).snap({
			type: "boolean",
			nullable: true
		})
	})

	it("nullable without a type", () => {
		attest(toOpenApi(type("string | number | null"))).snap({
			anyOf: [
				{ type: "number" },
				{ type: "string" },
				{ type: "string", nullable: true, enum: [null] }
			]
		})
		attest(toOpenApi(type("'a' | 1 | null"))).snap({
			anyOf: [
				{ enum: ["a", 1] },
				{ type: "string", nullable: true, enum: [null] }
			]
		})
	})

	it("not equal", () => {
		attest(toOpenApi(type("number != 5"))).snap({
			type: "number",
			not: { enum: [5] }
		})
	})

	it("arrays have items", () => {
		attest(toOpenApi(type("Array"))).snap({
			type: "array",
			items: {}
		})
		attest(toOpenApi(type("string[]"))).snap({
			type: "array",
			items: { type: "string" }
		})
	})

	it("examples", () => {
		attest(toOpenApi(type("string").configure({ examples: ["a", "b"] }))).snap({
			type: "string",
			example: "a"
		})
	})

	it("formats", () => {
		attest(
			toOpenApi(
				type({
					base64: "string.base64",
					base64url: "string.base64.url",
					date: "string.date"
				})
			)
		).snap({
			type: "object",
			properties: {
				base64: {
					type: "string",
					pattern:
						"^(?:[\\d+/A-Za-z]{4})*(?:[\\d+/A-Za-z]{2}==|[\\d+/A-Za-z]{3}=)?$",
					format: "byte"
				},
				base64url: {
					type: "string",
					pattern:
						"^(?:[\\w-]{4})*(?:[\\w-]{2}(?:==|%3D%3D)?|[\\w-]{3}(?:=|%3D)?)?$"
				},
				date: { type: "string", format: "date-time" }
			},
			required: ["base64", "base64url", "date"]
		})
	})

	it("tuple", () => {
		const T = type(["string", "number"])
		attest(() => toOpenApi(T)).throws
			.snap(`ToJsonSchemaError: Can't convert "arrayPrefix" to JSON Schema. Configure fallback.arrayPrefix to write it:
{
    code: "arrayPrefix",
    base: {
        type: "array",
        items: {},
        minItems: 2,
        maxItems: 2
    },
    elements: [
        {
            type: "string"
        },
        {
            type: "number"
        }
    ]
}`)
		attest(toOpenApi(T, { fallback: { arrayPrefix: anyOfPrefix } })).snap({
			type: "array",
			items: { anyOf: [{ type: "string" }, { type: "number" }] },
			minItems: 2,
			maxItems: 2
		})
	})

	it("variadic tuple", () => {
		attest(
			toOpenApi(type(["string", "...", "number[]"]), {
				fallback: { arrayPrefix: anyOfPrefix }
			})
		).snap({
			type: "array",
			items: { anyOf: [{ type: "string" }, { type: "number" }] },
			minItems: 1
		})
	})

	it("index signature", () => {
		attest(toOpenApi(type("Record<string, number>"))).snap({
			type: "object",
			additionalProperties: { type: "number" }
		})
		const T = type({ "[/^x-/]": "string" })
		attest(() => toOpenApi(T)).throws
			.snap(`ToJsonSchemaError: Can't convert "indexKey" to JSON Schema. Configure fallback.indexKey to write it:
{
    code: "indexKey",
    base: {
        type: "object"
    },
    key: {
        type: "string",
        pattern: "^x-"
    },
    value: {
        type: "string"
    }
}`)
		attest(toOpenApi(T, { fallback: { indexKey: ctx => ctx.base } })).snap({
			type: "object"
		})
	})

	it("cyclic", () => {
		const { Node } = scope({
			Node: { value: "number", "next?": "Node | null" }
		}).export()
		attest(() => toOpenApi(Node)).throws
			.snap(`ToJsonSchemaError: Can't convert "defs" to JSON Schema. Configure fallback.defs to write it:
{
    code: "defs",
    base: {
        $ref: "#/components/schemas/Node"
    },
    defs: {
        Node: {
            type: "object",
            properties: {
                value: {
                    type: "number"
                },
                next: {
                    anyOf: [
                        {
                            $ref: "#/components/schemas/Node"
                        },
                        {
                            type: "string",
                            nullable: true,
                            enum: [
                                null
                            ]
                        }
                    ]
                }
            },
            required: [
                "value"
            ]
        }
    }
}`)

		const components: Record<string, object> = {}
		const schema = toOpenApi(Node, {
			fallback: {
				defs: ctx => {
					Object.assign(components, ctx.defs)
					return ctx.base
				}
			}
		})
		attest(schema).snap({ $ref: "#/components/schemas/Node" })
		attest(components).snap({
			Node: {
				type: "object",
				properties: {
					value: { type: "number" },
					next: {
						anyOf: [
							{ $ref: "#/components/schemas/Node" },
							{ type: "string", nullable: true, enum: [null] }
						]
					}
				},
				required: ["value"]
			}
		})
	})

	it("annotatingFallback", () => {
		attest(
			toOpenApi(type(["string", "...", "number[]"]), {
				fallback: annotatingFallback
			})
		).snap({
			type: "array",
			items: {},
			minItems: 1,
			"x-arktype-prefix": [{ type: "string" }],
			"x-arktype-items": { type: "number" }
		})
		const { Node } = scope({ Node: { "next?": "Node" } }).export()
		attest(toOpenApi(Node, { fallback: annotatingFallback })).snap({
			$ref: "#/components/schemas/Node",
			"x-arktype-defs": {
				Node: {
					type: "object",
					properties: { next: { $ref: "#/components/schemas/Node" } }
				}
			}
		})
	})

	it("standard", () => {
		const T = type({
			pair: ["string", "number"],
			"name?": "string | null"
		})
		attest(T["~standard"].jsonSchema.input({ target })).snap({
			type: "object",
			properties: {
				pair: { type: "array", items: {}, minItems: 2, maxItems: 2 },
				name: { type: "string", nullable: true }
			},
			required: ["pair"]
		})
		attest(T["~standard"].jsonSchema.output({ target })).equals(
			T["~standard"].jsonSchema.input({ target })
		)
	})

	it("standard cyclic", () => {
		const { Node } = scope({ Node: { "next?": "Node" } }).export()
		attest(Node["~standard"].jsonSchema.input({ target })).snap({
			$ref: "#/components/schemas/Node",
			definitions: {
				Node: {
					type: "object",
					properties: { next: { $ref: "#/components/schemas/Node" } }
				}
			}
		})
	})

	it("unknown target", () => {
		attest(() =>
			type("string").toJsonSchema({ target: "draft-04" as never })
		).throws(writeInvalidJsonSchemaTargetMessage("draft-04"))
	})
})

import { attest, contextualize } from "@ark/attest"
import {
	annotatingFallback,
	toJsonSchemaTargets,
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

const toOpenApi = (
	t: { toJsonSchema: (opts: ToJsonSchema.Options) => JsonSchema },
	opts?: ToJsonSchema.Options
): JsonSchema => t.toJsonSchema({ ...opts, target })

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

	it("discriminated union", () => {
		const Destination = type({ type: "'bankAccount'", routing: "string" }).or({
			type: "'card' | 'debitCard'",
			last4: "string"
		})
		attest(toOpenApi(Destination)).snap({
			oneOf: [
				{
					type: "object",
					properties: {
						last4: { type: "string" },
						type: { type: "string", enum: ["card", "debitCard"] }
					},
					required: ["last4", "type"]
				},
				{
					type: "object",
					properties: {
						routing: { type: "string" },
						type: { type: "string", enum: ["bankAccount"] }
					},
					required: ["routing", "type"]
				}
			],
			discriminator: { propertyName: "type" }
		})
		attest(toOpenApi(Destination, { discriminator: false })).snap({
			oneOf: (toOpenApi(Destination) as JsonSchema.OneOf).oneOf
		})
	})

	it("discriminated union of definitions maps each value", () => {
		const { Ab } = scope({
			A: { kind: "'a'", "next?": "B" },
			B: { kind: "'b' | 'c'", "next?": "A" },
			Ab: "A | B"
		}).export()
		attest(toOpenApi(Ab, { fallback: { defs: ctx => ctx.base } })).snap({
			oneOf: [
				{ $ref: "#/components/schemas/B" },
				{ $ref: "#/components/schemas/A" }
			],
			discriminator: {
				propertyName: "kind",
				mapping: {
					a: "#/components/schemas/A",
					b: "#/components/schemas/B",
					c: "#/components/schemas/B"
				}
			}
		})
	})

	it("nullable discriminated union", () => {
		const T = type({ kind: "'a'", a: "string" })
			.or({ kind: "'b'", b: "number" })
			.or("null")
		attest(toOpenApi(T)).snap({
			anyOf: [
				{
					oneOf: [
						{
							type: "object",
							properties: {
								a: { type: "string" },
								kind: { type: "string", enum: ["a"] }
							},
							required: ["a", "kind"]
						},
						{
							type: "object",
							properties: {
								b: { type: "number" },
								kind: { type: "string", enum: ["b"] }
							},
							required: ["b", "kind"]
						}
					],
					discriminator: { propertyName: "kind" }
				},
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

	it("leaves out meta it has no keyword for", () => {
		const T = type("string").configure({
			$comment: "internal",
			readOnly: true,
			examples: ["a"]
		})
		attest(toOpenApi(T)).snap({ type: "string", readOnly: true, example: "a" })
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

	it("contentMediaType is left out of a keyword's schema, not yours", () => {
		attest(toOpenApi(type("string.json"))).snap({
			type: "string",
			description: "a JSON string"
		})
		const Configured = type("string").configure({
			jsonSchema: { type: "string", contentMediaType: "application/json" }
		})
		attest(toOpenApi(Configured)).snap({
			type: "string",
			contentMediaType: "application/json"
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

	it("string index next to declared keys", () => {
		const T = type({ a: "number", "[string]": "number" })
		const expected: JsonSchema.Object = {
			type: "object",
			properties: { a: { type: "number" } },
			required: ["a"],
			additionalProperties: { type: "number" }
		}
		attest(toOpenApi(T)).equals(expected)
		attest(T["~standard"].jsonSchema.input({ target })).equals(expected)
	})

	it("string index next to a declared value it narrows", () => {
		const T = type({ a: "number | string", "[string]": "number" })
		attest(() => toOpenApi(T)).throws(
			'Can\'t convert "indexKey" to JSON Schema.'
		)
		// what's representable, without the index a would have to satisfy
		attest(T["~standard"].jsonSchema.input({ target })).snap({
			type: "object",
			properties: { a: { anyOf: [{ type: "number" }, { type: "string" }] } },
			required: ["a"]
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

	it("aliasDefs to components", () => {
		const types = scope({
			Money: { amount: "number", currency: "string" },
			Address: { street: "string" },
			Customer: {
				address: "Address",
				"billing?": "Address | null",
				"referrer?": "Customer"
			},
			Invoice: { customer: "Customer", total: "Money", lines: "Money[]" }
		}).export()
		const components: Record<string, object> = {}
		const opts: ToJsonSchema.Options = {
			aliasDefs: true,
			fallback: {
				defs: ctx => {
					Object.assign(components, ctx.defs)
					return ctx.base
				}
			}
		}
		// each of the document's schemas, so components has what any references
		const refs = [
			types.Money,
			types.Address,
			types.Customer,
			types.Invoice
		].map(t => toOpenApi(t, opts))
		attest(refs).snap([
			{ $ref: "#/components/schemas/Money" },
			{ $ref: "#/components/schemas/Address" },
			{ $ref: "#/components/schemas/Customer" },
			{ $ref: "#/components/schemas/Invoice" }
		])
		attest(components).snap({
			Money: {
				type: "object",
				properties: {
					amount: { type: "number" },
					currency: { type: "string" }
				},
				required: ["amount", "currency"]
			},
			Address: {
				type: "object",
				properties: { street: { type: "string" } },
				required: ["street"]
			},
			Customer: {
				type: "object",
				properties: {
					address: { $ref: "#/components/schemas/Address" },
					billing: {
						anyOf: [
							{ $ref: "#/components/schemas/Address" },
							{ type: "string", nullable: true, enum: [null] }
						]
					},
					referrer: { $ref: "#/components/schemas/Customer" }
				},
				required: ["address"]
			},
			Invoice: {
				type: "object",
				properties: {
					customer: { $ref: "#/components/schemas/Customer" },
					lines: {
						type: "array",
						items: { $ref: "#/components/schemas/Money" }
					},
					total: { $ref: "#/components/schemas/Money" }
				},
				required: ["customer", "lines", "total"]
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

	// one schema, not a document, so its $refs resolve against itself
	it("standard cyclic refs the definitions beside it", () => {
		const { Node } = scope({ Node: { "next?": "Node" } }).export()
		attest(Node["~standard"].jsonSchema.input({ target })).snap({
			$ref: "#/definitions/Node",
			definitions: {
				Node: {
					type: "object",
					properties: { next: { $ref: "#/definitions/Node" } }
				}
			}
		})
		// a configured handler puts them in components.schemas, as for toJsonSchema
		attest(
			Node["~standard"].jsonSchema.input({
				target,
				libraryOptions: {
					fallback: { defs: (ctx: ToJsonSchema.DefsContext) => ctx.base }
				}
			})
		).snap({ $ref: "#/components/schemas/Node" })
	})

	it("unknown target", () => {
		attest(() =>
			type("string").toJsonSchema({ target: "draft-04" as never })
		).throws(
			writeInvalidJsonSchemaTargetMessage("draft-04", toJsonSchemaTargets)
		)
	})

	describe("openapi-3.1", () => {
		const target = "openapi-3.1"

		it("writes draft-2020-12 without $schema", () => {
			const T = type({
				pair: ["string", "number"],
				"name?": type("string | null").configure({ examples: ["a", null] })
			})
			attest(T.toJsonSchema({ target })).snap({
				type: "object",
				properties: {
					pair: {
						type: "array",
						minItems: 2,
						prefixItems: [{ type: "string" }, { type: "number" }],
						items: false
					},
					name: {
						anyOf: [{ type: "string" }, { type: "null" }],
						examples: ["a", null]
					}
				},
				required: ["pair"]
			})
			attest(T.toJsonSchema({ target })).equals(
				T.toJsonSchema({ target: "draft-2020-12", dialect: null })
			)
		})

		it("defs are components", () => {
			const types = scope({
				Address: { street: "string" },
				Node: { at: "Address", "next?": "Node | null" }
			}).export()
			attest(() => types.Node.toJsonSchema({ target })).throws(
				'Can\'t convert "defs" to JSON Schema'
			)
			const components: Record<string, object> = {}
			const schema = types.Node.toJsonSchema({
				target,
				aliasDefs: true,
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
						at: { $ref: "#/components/schemas/Address" },
						next: {
							anyOf: [{ $ref: "#/components/schemas/Node" }, { type: "null" }]
						}
					},
					required: ["at"]
				},
				Address: {
					type: "object",
					properties: { street: { type: "string" } },
					required: ["street"]
				}
			})
		})

		it("isn't a Standard JSON Schema target", () => {
			attest(() =>
				type("string")["~standard"].jsonSchema.input({ target })
			).throws(writeInvalidJsonSchemaTargetMessage(target))
		})
	})
})

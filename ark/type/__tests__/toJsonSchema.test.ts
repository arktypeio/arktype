import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"
import type { JSONSchema7 } from "json-schema"

// a keyword's pattern is its source, so only its presence is asserted
const elidePatterns = (schema: object): object =>
	JSON.parse(JSON.stringify(schema, (k, v) => (k === "pattern" ? "…" : v)))

contextualize(() => {
	describe("targets", () => {
		it("generates draft-2020-12 schema by default", () => {
			const T = type({ foo: "string" })
			const schema = T.toJsonSchema()
			attest(schema).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo"]
			})
		})

		it("draft-07 uses items array for tuples", () => {
			const T = type(["string", "number"])
			const schema = T.toJsonSchema({ target: "draft-07" })
			attest(schema).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "array",
				items: [{ type: "string" }, { type: "number" }],
				additionalItems: false,
				minItems: 2
			})
		})

		it("draft-07 uses definitions for references", () => {
			const types = type.module({
				user: {
					name: "string",
					friend: "user?"
				}
			})
			attest(types.user.toJsonSchema({ target: "draft-07" })).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				$ref: "#/definitions/user",
				definitions: {
					user: {
						type: "object",
						properties: {
							name: { type: "string" },
							friend: { $ref: "#/definitions/user" }
						},
						required: ["name"]
					}
				}
			})
		})
	})

	const referencedDefs = (schema: object) =>
		[...new Set(JSON.stringify(schema).match(/(?<="#\/\$defs\/)[^"]+/g))].sort()

	// https://github.com/arktypeio/arktype/issues/1546
	it("discriminated union in a recursive scope", () => {
		const s = scope({
			TypeA: { kind: "'a'", value: "number" },
			TypeB: { kind: "'b'", value: "number" },
			Union: "TypeA | TypeB",
			Node: { source: "SearchNode", data: "Union" },
			SearchNode: "Node"
		})
		const out = s.type("SearchNode").toJsonSchema()

		attest(referencedDefs(out)).equals(Object.keys(out.$defs!).sort())

		const recursive = scope({
			Node: { value: "string", "children?": "Node[]" }
		}).export().Node
		const union2 = type.or(
			type({ kind: "'a'", value: "string" }),
			type({ kind: "'b'", value: "number" })
		)
		const withUnion = type({ recursive, union: union2 }).toJsonSchema()

		attest(referencedDefs(withUnion)).equals(
			Object.keys(withUnion.$defs!).sort()
		)
	})

	// https://github.com/arktypeio/arktype/issues/1511
	it("refs in a partially overlapping discriminated union", () => {
		const T = type.or(
			{ a: type.enumerated("a", "b", "c"), b: "1" },
			{ a: type.enumerated("a", "e", "f"), b: "2" }
		)
		const out = T.toJsonSchema({ useRefs: true })

		attest(referencedDefs(out)).equals(Object.keys(out.$defs!).sort())
	})

	it("error names where its node is", () => {
		attest(() =>
			type({ user: { tags: ["string", "...", "Date[]"] } }).toJsonSchema()
		).throws('Can\'t convert "date" at user.tags[number] to JSON Schema.')
		attest(() =>
			type({ "[string]": { "weird key": "Date" } }).toJsonSchema()
		).throws('Can\'t convert "date" at [string]["weird key"] to JSON Schema.')
	})

	it("constrained index key with undeclared keys rejected", () => {
		const T = type({ ab: "number", "[string <= 3]": "number", "+": "reject" })
		attest(T.toJsonSchema({ dialect: null })).snap({
			type: "object",
			properties: { ab: { type: "number" } },
			required: ["ab"],
			propertyNames: { type: "string", maxLength: 3 },
			additionalProperties: { type: "number" }
		})
	})

	// https://github.com/arktypeio/arktype/issues/1612
	it("refs to a structure in a union", () => {
		const Thing = type({ a: "string" }).or("null")
		const out = Thing.toJsonSchema({ useRefs: true })

		attest(referencedDefs(out)).equals(Object.keys(out.$defs!).sort())
	})

	it("names defs independently of earlier types", () => {
		const toUserSchema = () =>
			scope({ user: { name: "string", "friends?": "user[]" } })
				.export()
				.user.toJsonSchema({ dialect: null })

		const first = toUserSchema()
		type({ name: "string", "friends?": "string[]" })

		attest(toUserSchema()).equals(first)
		attest(first).snap({
			$ref: "#/$defs/user",
			$defs: {
				user: {
					type: "object",
					properties: {
						name: { type: "string" },
						friends: { type: "array", items: { $ref: "#/$defs/user" } }
					},
					required: ["name"]
				}
			}
		})
	})

	describe("$defs", () => {
		const { user } = scope({
			user: { name: "string", "friends?": "user[]" }
		}).export()

		it("a cyclic alias is named by its alias", () => {
			attest(type({ owner: user }).toJsonSchema({ dialect: null })).snap({
				type: "object",
				properties: { owner: { $ref: "#/$defs/user" } },
				required: ["owner"],
				$defs: {
					user: {
						type: "object",
						properties: {
							name: { type: "string" },
							friends: { type: "array", items: { $ref: "#/$defs/user" } }
						},
						required: ["name"]
					}
				}
			})
		})

		it("an acyclic alias is inlined", () => {
			const { team } = scope({
				user: { name: "string" },
				team: { lead: "user", members: "user[]" }
			}).export()
			attest(team.toJsonSchema({ dialect: null })).snap({
				type: "object",
				properties: {
					lead: {
						type: "object",
						properties: { name: { type: "string" } },
						required: ["name"]
					},
					members: {
						type: "array",
						items: {
							type: "object",
							properties: { name: { type: "string" } },
							required: ["name"]
						}
					}
				},
				required: ["lead", "members"]
			})
		})

		it("an intersection with an alias is inlined", () => {
			attest(user.and({ age: "number" }).toJsonSchema({ dialect: null })).snap({
				type: "object",
				properties: {
					age: { type: "number" },
					name: { type: "string" },
					friends: { type: "array", items: { $ref: "#/$defs/user" } }
				},
				required: ["age", "name"],
				$defs: {
					user: {
						type: "object",
						properties: {
							name: { type: "string" },
							friends: { type: "array", items: { $ref: "#/$defs/user" } }
						},
						required: ["name"]
					}
				}
			})
		})

		it("a name another alias has is numbered", () => {
			const other = scope({ user: { id: "number", "next?": "user" } }).export()
			attest(
				type({ a: user, b: other.user }).toJsonSchema({ dialect: null })
			).snap({
				type: "object",
				properties: {
					a: { $ref: "#/$defs/user" },
					b: { $ref: "#/$defs/user2" }
				},
				required: ["a", "b"],
				$defs: {
					user: {
						type: "object",
						properties: {
							name: { type: "string" },
							friends: { type: "array", items: { $ref: "#/$defs/user" } }
						},
						required: ["name"]
					},
					user2: {
						type: "object",
						properties: {
							id: { type: "number" },
							next: { $ref: "#/$defs/user2" }
						},
						required: ["id"]
					}
				}
			})
		})

		it("generic instantiations", () => {
			const { root } = scope({
				"box<t>": { value: "t", "next?": "box<t>" },
				root: { s: "box<string>", n: "box<number>" }
			}).export()
			attest(root.toJsonSchema({ dialect: null })).snap({
				type: "object",
				properties: { n: { $ref: "#/$defs/box" }, s: { $ref: "#/$defs/box2" } },
				required: ["n", "s"],
				$defs: {
					box: {
						type: "object",
						properties: {
							value: { type: "number" },
							next: { $ref: "#/$defs/box" }
						},
						required: ["value"]
					},
					box2: {
						type: "object",
						properties: {
							value: { type: "string" },
							next: { $ref: "#/$defs/box2" }
						},
						required: ["value"]
					}
				}
			})
		})

		it("a cycle with no alias", () => {
			attest(type({ "self?": "this" }).toJsonSchema({ dialect: null })).snap({
				$ref: "#/$defs/type",
				$defs: {
					type: {
						type: "object",
						properties: { self: { $ref: "#/$defs/type" } }
					}
				}
			})
		})

		it("input and output", () => {
			const { node } = scope({
				node: {
					size: type("string").pipe(s => s.length, type("number")),
					"next?": "node"
				}
			}).export()
			const expected = node["~standard"].jsonSchema.input({
				target: "draft-2020-12"
			})
			attest(expected).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				$ref: "#/$defs/node",
				$defs: {
					node: {
						type: "object",
						properties: {
							size: { type: "string" },
							next: { $ref: "#/$defs/node" }
						},
						required: ["size"]
					}
				}
			})
			attest(node.in.toJsonSchema()).equals(expected)
			attest(node.out.toJsonSchema()).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				$ref: "#/$defs/node",
				$defs: {
					node: {
						type: "object",
						properties: {
							size: { type: "number" },
							next: { $ref: "#/$defs/node" }
						},
						required: ["size"]
					}
				}
			})
		})
	})

	it("an optional key's undefined is its absence", () => {
		const T = type({ "a?": "string | undefined", "b?": "undefined" })
		attest(T.toJsonSchema()).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			properties: { a: { type: "string" }, b: { enum: [] } }
		})
		attest(T["~standard"].jsonSchema.input({ target: "draft-2020-12" })).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			properties: { a: { type: "string" }, b: { enum: [] } }
		})
		attest(() => type({ a: "string | undefined" }).toJsonSchema()).throws(
			'Can\'t convert "unit" at a to JSON Schema'
		)
	})

	it("fits JSONSchema7 and Record<string, unknown> without a cast", () => {
		const schema = type({ a: "string[]", "b?": "1 | 2" }).toJsonSchema({
			target: "draft-07"
		})
		const draft07: JSONSchema7 = schema
		const record: Record<string, unknown> = schema
		attest(draft07).equals(record)
		attest(schema.properties).snap({
			a: { type: "array", items: { type: "string" } },
			b: { type: "number", enum: [1, 2] }
		})
	})

	it("an empty object has empty properties", () => {
		attest(type({}).toJsonSchema({ target: "openapi-3.0" })).snap({
			type: "object",
			properties: {}
		})
		attest(type({ "+": "reject" }).toJsonSchema()).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			properties: {},
			additionalProperties: false
		})
		attest(type({ "[string]": "number" }).toJsonSchema()).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			additionalProperties: { type: "number" }
		})
	})

	it("omits function meta", () => {
		const T = type("string").configure({ message: () => "a letter" })
		attest(T.toJsonSchema({ dialect: null })).snap({ type: "string" })
	})

	// https://github.com/arktypeio/arktype/issues/1470
	it("configured union of literals as enum", () => {
		const Provider = type("'sqlite' | 'postgresql'").configure({
			title: "Provider"
		})
		attest(Provider.toJsonSchema({ dialect: null })).snap({
			type: "string",
			enum: ["postgresql", "sqlite"],
			title: "Provider"
		})

		const Letter = type("'a' | 'b'").describe("a letter")
		attest(Letter.toJsonSchema({ dialect: null })).snap({
			type: "string",
			enum: ["a", "b"],
			description: "a letter"
		})

		const Described = type("'a'").describe("first").or("'b'").configure({
			title: "Letter"
		})
		attest(Described.toJsonSchema({ dialect: null })).snap({
			anyOf: [
				{ type: "string", const: "a", description: "first", title: "Letter" },
				{ type: "string", const: "b", title: "Letter" }
			],
			title: "Letter"
		})
	})

	// https://github.com/arktypeio/arktype/issues/1571
	it("jsonSchema meta replaces what a node's constraints imply", () => {
		const Even = type("number")
			.narrow(n => n % 2 === 0)
			.configure({
				description: "even",
				jsonSchema: { type: "integer", multipleOf: 2 }
			})
		attest(type({ n: Even }).toJsonSchema({ dialect: null })).snap({
			type: "object",
			properties: {
				n: { description: "even", type: "integer", multipleOf: 2 }
			},
			required: ["n"]
		})
	})

	it("jsonSchema meta isn't configured on references", () => {
		const T = type("string | number").configure({
			jsonSchema: { type: ["string", "number"] }
		})
		attest(T.exclude("number").toJsonSchema({ dialect: null })).snap({
			type: "string"
		})
	})

	// https://github.com/arktypeio/arktype/issues/1475
	it("keywords checked by a predicate", () => {
		const T = type({
			url: "string.url < 100",
			"pattern?": "string.regex",
			"json?": "string.json"
		})
		attest(T.toJsonSchema({ dialect: null })).snap({
			type: "object",
			properties: {
				url: { type: "string", maxLength: 99, format: "uri" },
				pattern: { type: "string", format: "regex" },
				json: {
					type: "string",
					contentMediaType: "application/json",
					description: "a JSON string"
				}
			},
			required: ["url"]
		})
	})

	it("keywords checked by a pattern", () => {
		const T = type({
			email: "string.email < 255",
			iso: "string.date.iso",
			base64: "string.base64",
			base64url: "string.base64.url"
		})
		attest(elidePatterns(T.toJsonSchema({ dialect: null }))).snap({
			type: "object",
			properties: {
				base64: { type: "string", pattern: "…", contentEncoding: "base64" },
				base64url: {
					type: "string",
					pattern: "…",
					contentEncoding: "base64url"
				},
				email: {
					type: "string",
					pattern: "…",
					format: "email",
					maxLength: 254
				},
				iso: {
					type: "string",
					pattern: "…",
					format: "date-time"
				}
			},
			required: ["base64", "base64url", "email", "iso"]
		})
	})

	it("keyword formats for draft-07", () => {
		attest(
			elidePatterns(
				type("string.date | string.base64.url").toJsonSchema({
					target: "draft-07"
				})
			)
		).snap({
			$schema: "http://json-schema.org/draft-07/schema#",
			anyOf: [
				{ type: "string", pattern: "…", contentEncoding: "base64url" },
				{ type: "string", format: "date-time" }
			]
		})
	})
})

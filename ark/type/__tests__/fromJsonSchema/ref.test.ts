import { attest, contextualize } from "@ark/attest"
import { fromJsonSchema } from "arktype"

contextualize(() => {
	it("$defs and definitions", () => {
		attest(
			fromJsonSchema({
				$ref: "#/$defs/name",
				$defs: { name: { type: "string", minLength: 1 } }
			}).expression
		).snap("string >= 1")
		attest(
			fromJsonSchema({
				type: "object",
				properties: { name: { $ref: "#/definitions/name" } },
				definitions: { name: { type: "string" } }
			}).expression
		).snap("{ name?: string } & isNonArray")
	})

	it("recursive", () => {
		const t = fromJsonSchema({
			$ref: "#/$defs/tree",
			$defs: {
				tree: {
					type: "object",
					properties: {
						value: { type: "number" },
						children: { type: "array", items: { $ref: "#/$defs/tree" } }
					},
					required: ["value"]
				}
			}
		})
		attest(
			t.allows({ value: 0, children: [{ value: 1, children: [] }] })
		).equals(true)
		attest(() =>
			t.assert({ value: 0, children: [{ value: 1, children: [{}] }] })
		).throws.snap(
			"TraversalError: children[0].children[0].value must be a number (was missing)"
		)
	})

	it("preserves readable $defs, definitions, and components/schemas names in cyclic expressions", () => {
		attest(
			fromJsonSchema({
				$defs: {
					Node: {
						type: "object",
						properties: { next: { $ref: "#/$defs/Node" } }
					}
				},
				$ref: "#/$defs/Node"
			}).expression
		).snap("{ next?: Node } & isNonArray")

		attest(
			fromJsonSchema({
				definitions: {
					Item: {
						type: "object",
						properties: { parent: { $ref: "#/definitions/Item" } }
					}
				},
				$ref: "#/definitions/Item"
			}).expression
		).snap("{ parent?: Item } & isNonArray")

		attest(
			fromJsonSchema({
				components: {
					schemas: {
						Category: {
							type: "object",
							properties: {
								sub: { $ref: "#/components/schemas/Category" }
							}
						}
					}
				},
				$ref: "#/components/schemas/Category"
			} as never).expression
		).snap("{ sub?: Category } & isNonArray")

		// disambiguates distinct cyclic refs sharing the same segment name
		const collided = fromJsonSchema({
			type: "object",
			properties: {
				a: { $ref: "#/$defs/Node" },
				b: { $ref: "#/definitions/Node" }
			},
			$defs: {
				Node: {
					type: "object",
					properties: { next: { $ref: "#/$defs/Node" } }
				}
			},
			definitions: {
				Node: {
					type: "object",
					properties: { prev: { $ref: "#/definitions/Node" } }
				}
			}
		})
		attest(collided.expression).snap(
			"{ a?: { next?: Node } & isNonArray, b?: { prev?: Node2 } & isNonArray } & isNonArray"
		)
		attest(collided.allows({ a: { next: {} }, b: { prev: {} } })).equals(true)

		// falls back to synthetic for non-identifiers, reserved/ambient keywords, and root #
		const syntheticNext = /^{ next\?: synthetic[\da-z]+ } & isNonArray$/
		attest(
			syntheticNext.test(
				fromJsonSchema({
					$defs: {
						"my-node": {
							type: "object",
							properties: { next: { $ref: "#/$defs/my-node" } }
						}
					},
					$ref: "#/$defs/my-node"
				}).expression
			)
		).equals(true)

		for (const reserved of [
			"this",
			"string",
			"Date",
			"Array",
			"unknown",
			"constructor",
			"toString"
		]) {
			attest(
				syntheticNext.test(
					fromJsonSchema({
						$defs: {
							[reserved]: {
								type: "object",
								properties: { next: { $ref: `#/$defs/${reserved}` } }
							}
						},
						$ref: `#/$defs/${reserved}`
					} as never).expression
				)
			).equals(true)
		}

		const rootSelfExpr = fromJsonSchema({
			type: "object",
			properties: { self: { $ref: "#" } }
		}).expression
		attest(
			rootSelfExpr.startsWith("{ self?: { self?: synthetic") &&
				rootSelfExpr.endsWith(" } & isNonArray } & isNonArray")
		).equals(true)
	})

	it("root and current resource", () => {
		const T = fromJsonSchema({
			type: "object",
			properties: { root: { $ref: "#" }, current: { $ref: "" } }
		})
		attest(T.allows({ root: { current: {} } })).equals(true)
		attest(T.allows({ root: { current: 1 } })).equals(false)
	})

	it("escaped pointer", () => {
		const t = fromJsonSchema({
			type: "object",
			properties: {
				slash: { $ref: "#/$defs/a~1b" },
				tilde: { $ref: "#/$defs/c~0d" },
				percent: { $ref: "#/$defs/e%25f" }
			},
			$defs: {
				"a/b": { type: "string" },
				"c~d": { type: "number" },
				"e%f": { type: "boolean" }
			}
		})
		attest(t.expression).snap(
			"{ percent?: boolean, slash?: string, tilde?: number } & isNonArray"
		)
	})

	it("embedded resource", () => {
		const t = fromJsonSchema({
			type: "object",
			properties: {
				a: {
					$id: "https://example.com/a",
					$ref: "#/$defs/value",
					$defs: { value: { type: "string" } }
				}
			},
			$defs: { value: { type: "number" } }
		})
		attest(t.expression).snap("{ a?: string } & isNonArray")
	})

	it("draft-04 id", () => {
		const t = fromJsonSchema({
			$schema: "http://json-schema.org/draft-04/schema#",
			type: "object",
			properties: {
				a: {
					id: "https://example.com/a",
					allOf: [{ $ref: "#/definitions/value" }],
					definitions: { value: { type: "string" } }
				}
			},
			definitions: { value: { type: "number" } }
		})
		attest(t.expression).snap("{ a?: string } & isNonArray")
	})

	it("anchor in OpenAPI components", () => {
		const t = fromJsonSchema({
			$ref: "#pet",
			components: {
				schemas: { Pet: { $anchor: "pet", type: "object", required: ["name"] } }
			}
		} as never)
		attest(t.expression).snap("{ name: unknown } & isNonArray")
	})

	it("anchor", () => {
		const t = fromJsonSchema({
			$ref: "#name",
			$defs: { name: { $anchor: "name", type: "string" } }
		})
		attest(t.expression).snap("string")
	})

	it("fragment id before 2019-09", () => {
		attest(
			fromJsonSchema({
				$schema: "http://json-schema.org/draft-07/schema#",
				$ref: "#name",
				definitions: { name: { $id: "#name", type: "string" } }
			}).expression
		).snap("string")
		attest(
			fromJsonSchema({
				$schema: "http://json-schema.org/draft-04/schema#",
				allOf: [{ $ref: "#name" }],
				definitions: { name: { id: "#name", type: "number" } }
			}).expression
		).snap("number")
	})

	it("anchor in an embedded resource", () => {
		const t = fromJsonSchema({
			$id: "https://example.com/root.json",
			$ref: "item.json#name",
			$defs: {
				item: {
					$id: "item.json",
					$defs: { name: { $anchor: "name", type: "string" } }
				},
				name: { $anchor: "name", type: "number" }
			}
		})
		attest(t.expression).snap("string")
	})

	it("embedded resource by URI", () => {
		const t = fromJsonSchema({
			$id: "https://example.com/schemas/root.json",
			type: "object",
			properties: {
				a: { $ref: "item.json" },
				b: { $ref: "https://example.com/schemas/item.json#/$defs/b" }
			},
			$defs: {
				item: {
					$id: "item.json",
					type: "string",
					$defs: { b: { type: "number" } }
				}
			}
		})
		attest(t.expression).snap("{ a?: string, b?: number } & isNonArray")
	})

	it("unresolvable", () => {
		attest(() =>
			// @ts-expect-error
			fromJsonSchema({ $ref: "#/$defs/missing", $defs: {} })
		).throws.snap(
			"ParseError: #/$ref (#/$defs/missing) doesn't resolve to a schema in its document"
		)
		attest(() =>
			fromJsonSchema({
				type: "object",
				// @ts-expect-error
				properties: { user: { $ref: "#/$defs/missing" } },
				$defs: {}
			})
		).throws.snap(
			"ParseError: #/properties/user/$ref (#/$defs/missing) doesn't resolve to a schema in its document"
		)
		attest(() => fromJsonSchema({ $ref: "#missing" })).throws.snap(
			"ParseError: #/$ref (#missing) doesn't resolve to a schema in its document"
		)
		attest(() => fromJsonSchema({ $ref: "http://[" })).throws.snap(
			"ParseError: #/$ref (http://[) doesn't resolve to a schema in its document"
		)
	})

	it("malformed definitions and pointers", () => {
		attest(() =>
			fromJsonSchema({ $defs: null, $ref: "#a" } as never)
		).throws.snap("ParseError: #/$defs must be an object of schemas (was null)")
		// a definition the ref doesn't reach is indexed, but never read
		attest(
			fromJsonSchema({
				$defs: { a: { $anchor: "a", type: "string" }, b: { $defs: null } },
				$ref: "#a"
			} as never).expression
		).snap("string")
		attest(() => fromJsonSchema({ $ref: "#/%ZZ" } as never)).throws.snap(
			"ParseError: #/$ref (#/%ZZ) doesn't resolve to a schema in its document"
		)
	})

	it("another document", () => {
		attest(() => fromJsonSchema({ $ref: "https://example.com/a" })).throws.snap(
			"ParseError: #/$ref must reference a schema in its own document (was https://example.com/a)"
		)
	})

	it("invalid $id", () => {
		attest(() =>
			fromJsonSchema({ properties: { a: { $id: "http://[" } } })
		).throws.snap(
			'ParseError: #/properties/a/$id must be a URI reference (was "http://[")'
		)
	})
})

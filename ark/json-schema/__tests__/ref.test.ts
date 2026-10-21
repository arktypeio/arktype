import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"

contextualize(() => {
	it("$defs", () => {
		const t = jsonSchemaToType({
			$ref: "#/$defs/name",
			$defs: { name: { type: "string", minLength: 1 } }
		})
		attest(t.expression).snap("string >= 1")
	})

	it("definitions", () => {
		const t = jsonSchemaToType({
			type: "object",
			properties: { name: { $ref: "#/definitions/name" } },
			definitions: { name: { type: "string" } }
		})
		attest(t.expression).snap("{ name?: string }")
	})

	it("recursive", () => {
		const t = jsonSchemaToType({
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

	it("recursive through a union", () => {
		const t = jsonSchemaToType({
			$ref: "#/$defs/list",
			$defs: {
				list: {
					type: "object",
					properties: {
						value: { type: "string" },
						next: { anyOf: [{ $ref: "#/$defs/list" }, { type: "null" }] }
					},
					required: ["value", "next"]
				}
			}
		})
		attest(t.allows({ value: "a", next: { value: "b", next: null } })).equals(
			true
		)
		attest(t.allows({ value: "a", next: { value: "b" } })).equals(false)
	})

	it("recursive tuple element", () => {
		const t = jsonSchemaToType({
			$ref: "#/$defs/pair",
			$defs: {
				pair: {
					type: "array",
					minItems: 1,
					prefixItems: [{ type: "string" }, { $ref: "#/$defs/pair" }],
					items: false
				}
			}
		})
		attest(t.allows(["a", ["b"]])).equals(true)
		attest(t.allows(["a", [1]])).equals(false)
	})

	it("root", () => {
		const t = jsonSchemaToType({
			type: "object",
			properties: { self: { $ref: "#" } }
		})
		attest(t.allows({ self: { self: {} } })).equals(true)
		attest(t.allows({ self: { self: 1 } })).equals(false)
	})

	it("escaped pointer", () => {
		const t = jsonSchemaToType({
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
			"{ percent?: boolean, slash?: string, tilde?: number }"
		)
	})

	it("siblings are intersected", () => {
		const t = jsonSchemaToType({
			$ref: "#/$defs/name",
			maxLength: 10,
			$defs: { name: { type: "string" } }
		})
		attest(t.expression).snap("string <= 10")
	})

	it("siblings are ignored before 2019-09", () => {
		const t = jsonSchemaToType({
			$schema: "http://json-schema.org/draft-07/schema#",
			$ref: "#/definitions/name",
			type: "number",
			definitions: { name: { type: "string" } }
		})
		attest(t.expression).snap("string")
	})

	it("OpenAPI components", () => {
		const t = jsonSchemaToType({
			$ref: "#/components/schemas/Pet",
			components: {
				schemas: {
					Pet: {
						type: "object",
						properties: { name: { type: "string" } },
						required: ["name"]
					}
				}
			}
		})
		attest(t.expression).snap("{ name: string }")
	})

	it("unresolvable", () => {
		attest(() =>
			// @ts-expect-error
			jsonSchemaToType({ $ref: "#/$defs/missing", $defs: {} })
		).throws.snap(
			"ParseError: $ref #/$defs/missing doesn't resolve to a schema in its document"
		)
	})

	it("another document", () => {
		attest(() =>
			jsonSchemaToType({ $ref: "https://example.com/a" })
		).throws.snap(
			"ParseError: #/$ref must be a JSON Pointer into its document like #/$defs/name, outside any nested $id (was https://example.com/a)"
		)
	})
})

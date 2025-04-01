import { attest, contextualize } from "@ark/attest"
import {
	parseJsonSchema,
	writeJsonSchemaArrayAdditionalItemsAndItemsAndPrefixItemsMessage,
	writeJsonSchemaArrayNonArrayItemsAndAdditionalItemsMessage
} from "@ark/jsonschema"

contextualize(() => {
	it("type array", () => {
		const t = parseJsonSchema({ type: "array" })
		attest(t.expression).snap("Array")
	})

	it("items", () => {
		const tItems = parseJsonSchema({ type: "array", items: { type: "string" } })
		attest(tItems.expression).snap("string[]")

		const tItemsArr = parseJsonSchema({
			type: "array",
			items: [{ type: "string" }, { type: "number" }]
		})
		attest(tItemsArr.expression).snap("[string, number]")
	})

	it("prefixItems", () => {
		const tPrefixItems = parseJsonSchema({
			type: "array",
			prefixItems: [{ type: "string" }, { type: "number" }]
		})
		attest(tPrefixItems.expression).snap("[string, number, ...unknown[]]")
	})

	it("items & prefixItems", () => {
		const tItemsAndPrefixItems = parseJsonSchema({
			type: "array",
			prefixItems: [{ type: "string" }, { type: "number" }],
			items: { type: "boolean" }
		})
		attest(tItemsAndPrefixItems.expression).snap(
			"[string, number, ...boolean[]]"
		)
	})

	it("additionalItems", () => {
		const tAdditionalItems = parseJsonSchema({
			type: "array",
			additionalItems: { type: "string" }
		})
		attest(tAdditionalItems.expression).snap("string[]")
	})

	it("additionalItems & items", () => {
		const tItemsVariadic = parseJsonSchema({
			type: "array",
			additionalItems: { type: "boolean" },
			items: [{ type: "string" }, { type: "number" }]
		})
		attest(tItemsVariadic.expression).snap("[string, number, ...boolean[]]")

		const tItemsFalseAdditional = parseJsonSchema({
			type: "array",
			additionalItems: false,
			items: [{ type: "string" }]
		})
		attest(tItemsFalseAdditional.expression).snap("[string]")

		attest(() =>
			parseJsonSchema({
				type: "array",
				additionalItems: { type: "string" },
				items: { type: "string" }
			})
		).throws(writeJsonSchemaArrayNonArrayItemsAndAdditionalItemsMessage())
	})

	it("additionalItems & prefixItems", () => {
		const tPrefixItemsAndAdditional = parseJsonSchema({
			type: "array",
			additionalItems: { type: "boolean" },
			prefixItems: [{ type: "string" }, { type: "number" }]
		})
		attest(tPrefixItemsAndAdditional.expression).snap(
			"[string, number, ...boolean[]]"
		)
	})

	it("additionalItems & items & prefixItems", () => {
		attest(() =>
			parseJsonSchema({
				type: "array",
				additionalItems: { type: "boolean" },
				items: { type: "null" },
				prefixItems: [{ type: "string" }, { type: "number" }]
			})
		).throws(writeJsonSchemaArrayAdditionalItemsAndItemsAndPrefixItemsMessage())
	})

	it("contains", () => {
		const tContains = parseJsonSchema({
			type: "array",
			contains: { type: "number" }
		})
		attest(tContains.json).snap({
			proto: "Array",
			predicate: ["$ark.jsonSchemaArrayContainsValidator"]
		})
		attest(tContains.allows([])).equals(false)
		attest(tContains.allows([1, 2, 3])).equals(true)
		attest(tContains.allows(["foo", 2, "baz"])).equals(true)
	})

	it("maxItems (positive)", () => {
		const tMaxItems = parseJsonSchema({
			type: "array",
			maxItems: 5
		})
		attest(tMaxItems.expression).snap("Array <= 5")
	})

	it("maxItems (negative)", () => {
		attest(() => parseJsonSchema({ type: "array", maxItems: -1 })).throws(
			"TraversalError: maxItems must be non-negative"
		)
	})

	it("minItems (positive)", () => {
		const tMinItems = parseJsonSchema({
			type: "array",
			minItems: 5
		})
		attest(tMinItems.expression).snap("Array >= 5")
	})

	it("minItems (negative)", () => {
		attest(() => parseJsonSchema({ type: "array", minItems: -1 })).throws(
			"TraversalError: minItems must be non-negative"
		)
	})

	it("uniqueItems", () => {
		const tUniqueItems = parseJsonSchema({
			type: "array",
			uniqueItems: true
		})
		attest(tUniqueItems.json).snap({
			proto: "Array",
			predicate: ["$ark.jsonSchemaArrayUniqueItemsValidator"]
		})
		attest(tUniqueItems.allows([1, 2, 3])).equals(true)
		attest(tUniqueItems.allows([1, 1, 2])).equals(false)
		attest(
			tUniqueItems.allows([
				{ foo: { bar: ["baz", { qux: "quux" }] } },
				{ foo: { bar: ["baz", { qux: "quux" }] } }
			])
		).equals(false)
		attest(
			// JSON Schema specifies that arrays must be same order to be classified as equal
			tUniqueItems.allows([
				{ foo: { bar: ["baz", { qux: "quux" }] } },
				{ foo: { bar: [{ qux: "quux" }, "baz"] } }
			])
		).equals(true)

		attest(() =>
			tUniqueItems.assert([1, 1, 2, 3, 3, { foo: "string" }, { foo: "string" }])
		).throws(
			'TraversalError: must be an array of unique items (was an array with 3 duplicates: 1, 3, and {"foo":"string"})'
		)
	})
})

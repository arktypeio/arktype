import { attest, contextualize } from "@ark/attest"
import {
	jsonSchemaToType,
	writeJsonSchemaArrayAdditionalItemsAndItemsAndPrefixItemsMessage,
	writeJsonSchemaArrayNonArrayItemsAndAdditionalItemsMessage
} from "@ark/json-schema"

contextualize(() => {
	it("type array", () => {
		const t = jsonSchemaToType({ type: "array" })
		attest<unknown[]>(t.infer)
		attest(t.expression).snap("Array")
	})

	it("items", () => {
		const tItems = jsonSchemaToType({
			type: "array",
			items: { type: "string" }
		})
		attest<string[]>(tItems.infer)
		attest(tItems.expression).snap("string[]")

		const tItemsArr = jsonSchemaToType({
			type: "array",
			items: [{ type: "string" }, { type: "number" }]
		})
		attest<[string, number]>(tItemsArr.infer)
		attest(tItemsArr.expression).snap("[string, number]")
	})

	it("prefixItems", () => {
		const tPrefixItems = jsonSchemaToType({
			type: "array",
			prefixItems: [{ type: "string" }, { type: "number" }]
		})
		attest<[string, number, ...unknown[]]>(tPrefixItems.infer)
		attest(tPrefixItems.expression).snap("[string, number, ...unknown[]]")
	})

	it("items & prefixItems", () => {
		const tItemsFalseAndPrefixItems = jsonSchemaToType({
			type: "array",
			prefixItems: [{ type: "string" }, { type: "number" }],
			items: false
		})
		attest<[string, number]>(tItemsFalseAndPrefixItems.infer)

		const tItemsAndPrefixItems = jsonSchemaToType({
			type: "array",
			prefixItems: [{ type: "string" }, { type: "number" }],
			items: { type: "boolean" }
		})
		attest<[string, number, ...boolean[]]>(tItemsAndPrefixItems.infer)

		const tItemsArrayAndPrefixItems = jsonSchemaToType({
			type: "array",
			prefixItems: [{ type: "string" }, { type: "number" }],
			items: [{ type: "boolean" }, { type: "null" }]
		})
		attest<[string, number, boolean, null]>(tItemsArrayAndPrefixItems.infer)
		attest(tItemsArrayAndPrefixItems.expression).snap(
			"[string, number, boolean, null]"
		)
	})

	it("additionalItems", () => {
		const tAdditionalItems = jsonSchemaToType({
			type: "array",
			additionalItems: { type: "string" }
		})
		attest<string[]>(tAdditionalItems.infer)
		attest(tAdditionalItems.expression).snap("string[]")
	})

	it("additionalItems & items", () => {
		const tItemsVariadic = jsonSchemaToType({
			type: "array",
			additionalItems: { type: "boolean" },
			items: [{ type: "string" }, { type: "number" }]
		})
		attest<[string, number, ...boolean[]]>(tItemsVariadic.infer)
		attest(tItemsVariadic.expression).snap("[string, number, ...boolean[]]")

		const tItemsFalseAdditional = jsonSchemaToType({
			type: "array",
			additionalItems: false,
			items: [{ type: "string" }]
		})
		attest<[string]>(tItemsFalseAdditional.infer)
		attest(tItemsFalseAdditional.expression).snap("[string]")

		attest(
			() =>
				// @ts-ignore Suppress 'excessively deep and possibly infinite' error
				jsonSchemaToType({
					type: "array",
					additionalItems: { type: "string" },
					items: { type: "string" }
				}) as never
		).throws(writeJsonSchemaArrayNonArrayItemsAndAdditionalItemsMessage())
	})

	it("additionalItems & prefixItems", () => {
		const tPrefixItemsAndAdditional = jsonSchemaToType({
			type: "array",
			additionalItems: { type: "boolean" },
			prefixItems: [{ type: "string" }, { type: "number" }]
		})
		attest(tPrefixItemsAndAdditional.expression).snap(
			"[string, number, ...boolean[]]"
		)
	})

	it("additionalItems & items & prefixItems", () => {
		attest(
			() =>
				jsonSchemaToType({
					type: "array",
					additionalItems: { type: "boolean" },
					items: { type: "null" },
					prefixItems: [{ type: "string" }, { type: "number" }]
				}) as never
		).throws(writeJsonSchemaArrayAdditionalItemsAndItemsAndPrefixItemsMessage())
	})

	it("contains", () => {
		const tContains = jsonSchemaToType({
			type: "array",
			contains: { type: "number" }
		})
		attest<unknown[]>(tContains.infer)
		attest(tContains.json).snap({
			proto: "Array",
			predicate: ["$ark.jsonSchemaArrayContainsValidator"]
		})
		attest(tContains.allows([])).equals(false)
		attest(tContains.allows([1, 2, 3])).equals(true)
		attest(tContains.allows(["foo", 2, "baz"])).equals(true)
	})

	it("maxItems (positive)", () => {
		const tMaxItems = jsonSchemaToType({
			type: "array",
			maxItems: 5
		})
		attest<unknown[]>(tMaxItems.infer)
		attest(tMaxItems.expression).snap("Array <= 5")
	})

	it("maxItems (negative)", () => {
		attest(
			() => jsonSchemaToType({ type: "array", maxItems: -1 }) as never
		).throws("TraversalError: maxItems must be non-negative")
	})

	it("minItems (positive)", () => {
		const tMinItems = jsonSchemaToType({
			type: "array",
			minItems: 5
		})
		attest<unknown[]>(tMinItems.infer)
		attest(tMinItems.expression).snap("Array >= 5")
	})

	it("minItems (negative)", () => {
		attest(
			() => jsonSchemaToType({ type: "array", minItems: -1 }) as never
		).throws("TraversalError: minItems must be non-negative")
	})

	it("minItems (0)", () => {
		const tMinItems = jsonSchemaToType({
			type: "array",
			minItems: 0,
			items: { type: "string" }
		})

		attest(tMinItems.expression).snap("string[]")
	})

	it("uniqueItems", () => {
		const tUniqueItems = jsonSchemaToType({
			type: "array",
			uniqueItems: true
		})
		attest<unknown[]>(tUniqueItems.infer)
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

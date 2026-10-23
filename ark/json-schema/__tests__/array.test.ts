import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"

contextualize(() => {
	it("type array", () => {
		const t = jsonSchemaToType({ type: "array" })
		attest(t.expression).snap("Array")
	})

	it("items", () => {
		const tItems = jsonSchemaToType({
			type: "array",
			items: { type: "string" }
		})
		attest(tItems.expression).snap("string[]")

		const tItemsArr = jsonSchemaToType({
			type: "array",
			items: [{ type: "string" }, { type: "number" }]
		})
		attest(tItemsArr.expression).snap("[string?, number?, ...unknown[]]")
	})

	it("prefixItems", () => {
		const tPrefixItems = jsonSchemaToType({
			type: "array",
			prefixItems: [{ type: "string" }, { type: "number" }]
		})
		attest(tPrefixItems.expression).snap("[string?, number?, ...unknown[]]")
	})

	it("items & prefixItems", () => {
		const tItemsAndPrefixItems = jsonSchemaToType({
			type: "array",
			prefixItems: [{ type: "string" }, { type: "number" }],
			items: { type: "boolean" }
		})
		attest(tItemsAndPrefixItems.expression).snap(
			"[string?, number?, ...boolean[]]"
		)
	})

	it("additionalItems & items", () => {
		const tItemsVariadic = jsonSchemaToType({
			type: "array",
			additionalItems: { type: "boolean" },
			items: [{ type: "string" }, { type: "number" }]
		})
		attest(tItemsVariadic.expression).snap("[string?, number?, ...boolean[]]")

		const tItemsFalseAdditional = jsonSchemaToType({
			type: "array",
			additionalItems: false,
			items: [{ type: "string" }]
		})
		attest(tItemsFalseAdditional.expression).snap("[string?]")

		attest(
			jsonSchemaToType({
				type: "array",
				additionalItems: { type: "string" },
				items: { type: "string" }
			}).expression
		).snap("string[]")
	})

	it("additionalItems & prefixItems", () => {
		const tPrefixItemsAndAdditional = jsonSchemaToType({
			type: "array",
			additionalItems: { type: "boolean" },
			prefixItems: [{ type: "string" }, { type: "number" }]
		})
		attest(tPrefixItemsAndAdditional.expression).snap(
			"[string?, number?, ...unknown[]]"
		)
	})

	it("additionalItems & items & prefixItems", () => {
		attest(
			jsonSchemaToType({
				type: "array",
				additionalItems: { type: "boolean" },
				items: { type: "null" },
				prefixItems: [{ type: "string" }, { type: "number" }]
			}).expression
		).snap("[string?, number?, ...null[]]")
	})

	it("maxContains message", () => {
		// JsonSchema.Array doesn't declare maxContains, though it's read
		const T = jsonSchemaToType({
			type: "array",
			contains: { type: "number" },
			maxContains: 1
		} as never)
		attest(() => T.assert([1, 2])).throws.snap(
			"TraversalError: must be an array with exactly 1 item that is a number (was an array)"
		)
	})

	it("minItems and maxItems", () => {
		attest(jsonSchemaToType({ type: "array", maxItems: 5 }).expression).snap(
			"Array <= 5"
		)
		attest(jsonSchemaToType({ type: "array", minItems: 5 }).expression).snap(
			"Array >= 5"
		)
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
		attest(
			// JSON Schema specifies that arrays must be same order to be classified as equal
			tUniqueItems.allows([
				{ foo: { bar: ["baz", { qux: "quux" }] } },
				{ foo: { bar: [{ qux: "quux" }, "baz"] } }
			])
		).equals(true)

		attest(() =>
			tUniqueItems.assert([1, 1, 2, 3, 3, { foo: "string" }, { foo: "string" }])
		).throws.snap(
			"TraversalError: must be an array of unique items (was an array)"
		)
	})
})

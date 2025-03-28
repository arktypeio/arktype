import { attest, contextualize } from "@ark/attest"
import { parseJsonSchema } from "@ark/jsonschema"

contextualize(() => {
	it("type array", () => {
		const t = parseJsonSchema({ type: "array" })
		attest(t.json).snap({ proto: "Array" })
	})

	it("items", () => {
		const tItems = parseJsonSchema({ type: "array", items: { type: "string" } })
		attest(tItems.json).snap({ proto: "Array", sequence: "string" })

		const tItemsArr = parseJsonSchema({
			type: "array",
			items: [{ type: "string" }, { type: "number" }]
		})
		attest(tItemsArr.json).snap({
			proto: "Array",
			sequence: { prefix: ["string", "number"] },
			exactLength: 2
		})
	})

	it("prefixItems", () => {
		const tPrefixItems = parseJsonSchema({
			type: "array",
			prefixItems: [{ type: "string" }, { type: "number" }]
		})
		attest(tPrefixItems.json).snap({
			proto: "Array",
			sequence: { prefix: ["string", "number"] },
			exactLength: 2
		})
	})

	it("items & prefixItems", () => {
		const tItemsAndPrefixItems = parseJsonSchema({
			type: "array",
			prefixItems: [{ type: "string" }, { type: "number" }],
			items: { type: "boolean" }
		})
		attest(tItemsAndPrefixItems.json).snap({
			proto: "Array",
			minLength: 2,
			sequence: {
				prefix: ["string", "number"],
				variadic: [{ unit: false }, { unit: true }]
			}
		})
	})

	it("additionalItems", () => {
		const tAdditionalItems = parseJsonSchema({
			type: "array",
			additionalItems: { type: "string" }
		})
		attest(tAdditionalItems.json).snap({
			proto: "Array",
			sequence: "string"
		})
	})

	it("additionalItems & items", () => {
		const tItemsVariadic = parseJsonSchema({
			type: "array",
			additionalItems: { type: "boolean" },
			items: [{ type: "string" }, { type: "number" }]
		})
		attest(tItemsVariadic.json).snap({
			minLength: 2,
			proto: "Array",
			sequence: {
				prefix: ["string", "number"],
				variadic: [{ unit: false }, { unit: true }]
			}
		})

		const tItemsFalseAdditional = parseJsonSchema({
			type: "array",
			additionalItems: false,
			items: [{ type: "string" }]
		})
		attest(tItemsFalseAdditional.json).snap({
			proto: "Array",
			exactLength: 1,
			sequence: { prefix: ["string"] }
		})

		attest(() =>
			parseJsonSchema({
				type: "array",
				additionalItems: { type: "string" },
				items: { type: "string" }
			})
		).throws(
			"ParseError: Provided array JSON Schema cannot have non-array 'items' and 'additionalItems"
		)
	})

	it("additionalItems & prefixItems", () => {
		const tPrefixItemsAndAdditional = parseJsonSchema({
			type: "array",
			additionalItems: { type: "boolean" },
			prefixItems: [{ type: "string" }, { type: "number" }]
		})
		attest(tPrefixItemsAndAdditional.json).snap({
			minLength: 2,
			proto: "Array",
			sequence: {
				prefix: ["string", "number"],
				variadic: [{ unit: false }, { unit: true }]
			}
		})
	})

	it("additionalItems & items & prefixItems", () => {
		attest(() =>
			parseJsonSchema({
				type: "array",
				additionalItems: { type: "boolean" },
				items: { type: "null" },
				prefixItems: [{ type: "string" }, { type: "number" }]
			})
		).throws(
			"ParseError: Provided array JSON Schema cannot have 'additionalItems' and 'items' and 'prefixItems'"
		)
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
		attest(tMaxItems.json).snap({
			proto: "Array",
			maxLength: 5
		})
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
		attest(tMinItems.json).snap({
			proto: "Array",
			minLength: 5
		})
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
	})
})

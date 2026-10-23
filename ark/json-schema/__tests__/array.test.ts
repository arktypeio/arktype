import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"

contextualize(() => {
	it("items array", () => {
		attest(
			jsonSchemaToType({
				type: "array",
				items: [{ type: "string" }, { type: "number" }]
			}).expression
		).snap("[string?, number?, ...unknown[]]")
		attest(
			jsonSchemaToType({
				type: "array",
				items: [{ type: "string" }],
				additionalItems: false
			}).expression
		).snap("[string?]")
	})

	it("prefixItems", () => {
		attest(
			jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: { type: "boolean" }
			}).expression
		).snap("[string?, number?, ...boolean[]]")
	})

	it("additionalItems applies only beside an items array", () => {
		attest(
			jsonSchemaToType({
				type: "array",
				additionalItems: { type: "string" },
				items: { type: "number" }
			}).expression
		).snap("number[]")
		attest(
			jsonSchemaToType({
				type: "array",
				additionalItems: { type: "boolean" },
				prefixItems: [{ type: "string" }]
			}).expression
		).snap("[string?, ...unknown[]]")
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

	it("uniqueItems", () => {
		const T = jsonSchemaToType({ type: "array", uniqueItems: true })
		// arrays are only equal in the same order
		attest(
			T.allows([
				{ foo: { bar: ["baz", { qux: "quux" }] } },
				{ foo: { bar: [{ qux: "quux" }, "baz"] } }
			])
		).equals(true)
		attest(() => T.assert([{ foo: "string" }, { foo: "string" }])).throws.snap(
			"TraversalError: must be an array of unique items (was an array)"
		)
	})
})

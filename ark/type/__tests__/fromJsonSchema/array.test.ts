import { attest, contextualize } from "@ark/attest"
import { fromJsonSchema } from "arktype"

contextualize(() => {
	it("items array", () => {
		attest(
			fromJsonSchema({
				type: "array",
				items: [{ type: "string" }, { type: "number" }]
			}).expression
		).snap("[string?, number?, ...unknown[]]")
		attest(
			fromJsonSchema({
				type: "array",
				items: [{ type: "string" }],
				additionalItems: false
			}).expression
		).snap("[string?]")
	})

	it("prefixItems", () => {
		attest(
			fromJsonSchema({
				type: "array",
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: { type: "boolean" }
			}).expression
		).snap("[string?, number?, ...boolean[]]")
	})

	it("rejects array items beside prefixItems in 2020-12", () => {
		attest(() =>
			fromJsonSchema({
				type: "array",
				prefixItems: [{ type: "string" }],
				// @ts-expect-error
				items: [{ type: "number" }]
			})
		).throws.snap(
			'ParseError: #/items must be a schema beside prefixItems (was [{"type":"number"}])'
		)
		// draft-07 and 2019-09 ignore unknown prefixItems and read items array
		attest(
			fromJsonSchema({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "array",
				prefixItems: [{ type: "string" }],
				items: [{ type: "number" }]
			}).expression
		).snap("[number?, ...unknown[]]")
		attest(
			fromJsonSchema({
				$schema: "https://json-schema.org/draft/2019-09/schema",
				type: "array",
				prefixItems: [{ type: "string" }],
				items: [{ type: "number" }]
			}).expression
		).snap("[number?, ...unknown[]]")
	})

	it("additionalItems applies only beside an items array", () => {
		attest(
			fromJsonSchema({
				type: "array",
				additionalItems: { type: "string" },
				items: { type: "number" }
			}).expression
		).snap("number[]")
		attest(
			fromJsonSchema({
				type: "array",
				additionalItems: { type: "boolean" },
				prefixItems: [{ type: "string" }]
			}).expression
		).snap("[string?, ...unknown[]]")
	})

	it("maxContains message", () => {
		// JsonSchema.Array doesn't declare maxContains, though it's read
		const T = fromJsonSchema({
			type: "array",
			contains: { type: "number" },
			maxContains: 1
		} as never)
		attest(() => T.assert([1, 2])).throws.snap(
			"TraversalError: must be an array with exactly 1 item that is a number"
		)
	})

	it("uniqueItems", () => {
		const T = fromJsonSchema({ type: "array", uniqueItems: true })
		// arrays are only equal in the same order
		attest(
			T.allows([
				{ foo: { bar: ["baz", { qux: "quux" }] } },
				{ foo: { bar: [{ qux: "quux" }, "baz"] } }
			])
		).equals(true)
		attest(() => T.assert([{ foo: "string" }, { foo: "string" }])).throws.snap(
			"TraversalError: must be an array of unique items"
		)
	})
})

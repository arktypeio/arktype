import { attest, contextualize } from "@ark/attest"
import { writeNonStructuralOperandMessage } from "@ark/schema"
import { keywords, scope, type } from "arktype"

contextualize(() => {
	it("parsed", () => {
		const types = scope({
			base: {
				"foo?": "0",
				"bar?": "0"
			},
			merged: {
				bar: "1",
				"baz?": "1"
			},
			actual: "Merge<base, merged>",
			expected: {
				"foo?": "0",
				bar: "1",
				"baz?": "1"
			}
		}).export()

		attest<typeof types.expected.t>(types.actual.t)
		attest(types.actual.expression).equals(types.expected.expression)
	})

	it("invoked", () => {
		const s = Symbol()
		const t = keywords.Merge(
			{
				"[string]": "number | bigint",
				foo: "0",
				[s]: "true"
			},
			{
				"[string]": "bigint",
				"foo?": "1n"
			}
		)

		const expected = type({
			"[string]": "bigint",
			"foo?": "1n",
			[s]: "true"
		})

		attest<typeof expected.t>(t.t)
		attest(t.expression).equals(expected.expression)
	})

	it("chained", () => {
		const t = type({
			"[string]": "number",
			"bar?": "0",
			foo: "0"
		}).merge({
			"foo?": "1",
			baz: "1"
		})

		const expected = type({
			"[string]": "number",
			"bar?": "0",
			"foo?": "1",
			baz: "1"
		})

		attest<typeof expected.t>(t.t)
		attest(t.expression).equals(expected.expression)
	})

	it("non-object operand", () => {
		attest(() =>
			type({
				foo: "0"
				// @ts-expect-error
			}).merge("string")
		)
			.throws(writeNonStructuralOperandMessage("merge", "string"))
			.type.errors(
				`ErrorType<"Merged type must be an object", [actual: string]>`
			)
	})
})

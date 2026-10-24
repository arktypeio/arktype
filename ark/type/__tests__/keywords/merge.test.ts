import { attest, contextualize } from "@ark/attest"
import {
	writeInvalidMergeOperandMessage,
	writeNonStructuralOperandMessage
} from "@ark/schema"
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
		const T = keywords.Merge(
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

		const Expected = type({
			"[string]": "bigint",
			"foo?": "1n",
			[s]: "true"
		})

		attest<typeof Expected.t>(T.t)
		attest(T.expression).equals(Expected.expression)
	})

	it("invoked then unioned", () => {
		const T = keywords.Merge({ a: "string" }, { b: "number" }).or("string[]")

		attest<{ a: string; b: number } | string[]>(T.t)
		attest(T.expression).snap("{ a: string, b: number } | string[]")
	})

	it("chained", () => {
		const T = type({
			"[string]": "number",
			"bar?": "0",
			foo: "0"
		}).merge({
			"foo?": "1",
			baz: "1"
		})

		const Expected = type({
			"[string]": "number",
			"bar?": "0",
			"foo?": "1",
			baz: "1"
		})

		attest<typeof Expected.t>(T.t)
		attest(T.expression).equals(Expected.expression)
	})

	it("chained with a described value", () => {
		const T = type({ a: "string" })
			.partial()
			.merge({ "b?": type("string").describe("an ID") })

		attest<{ a?: string; b?: string }>(T.t)
		attest(T({ b: 1 }).toString()).snap("b must be an ID (was a number)")
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
				`ErrorType<["Merged type must be an object", actual: string]>`
			)
	})

	it("array operand", () => {
		attest(() => type("unknown[]").merge({ a: "string" })).throws(
			writeInvalidMergeOperandMessage("Array")
		)
		attest(() => type({ a: "string" }).merge(type([]))).throws(
			writeInvalidMergeOperandMessage("[]")
		)
		attest(() => type({ a: "string" }).merge(type(["string"]))).throws(
			writeInvalidMergeOperandMessage("[string]")
		)
	})
})

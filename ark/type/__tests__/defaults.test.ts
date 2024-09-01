import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"
import type { Default } from "arktype/internal/keywords/ast.ts"
import type { Date } from "arktype/internal/keywords/constructors/Date.ts"
import { writeNonLiteralDefaultMessage } from "arktype/internal/parser/string/shift/operator/default.ts"

contextualize(() => {
	describe("parsing and traversal", () => {
		it("base", () => {
			const o = type({ foo: "string", bar: ["number", "=", 5] })

			// ensure type ast displays is exactly as expected
			attest(o.t).type.toString.snap(`{
	foo: string
	bar: (In?: number | undefined) => Default<5>
}`)
			attest<{ foo: string; bar?: number }>(o.inferIn)
			attest<{ foo: string; bar: number }>(o.infer)

			attest(o.json).snap({
				required: [{ key: "foo", value: "string" }],
				optional: [
					{
						default: 5,
						key: "bar",
						value: { domain: "number", meta: { default: 5 } }
					}
				],
				domain: "object"
			})

			attest(o({ foo: "", bar: 4 })).equals({ foo: "", bar: 4 })
			attest(o({ foo: "" })).equals({ foo: "", bar: 5 })
			attest(o({ bar: 4 }).toString()).snap(
				"foo must be a string (was missing)"
			)
			attest(o({ foo: "", bar: "" }).toString()).snap(
				"bar must be a number (was a string)"
			)
		})

		it("defined with wrong type", () => {
			attest(() =>
				// @ts-expect-error
				type({ foo: "string", bar: ["number", "=", "5"] })
			)
				.throws.snap(
					'ParseError: Default value for key "bar" must be a number (was a string)'
				)
				.type.errors.snap("Type 'string' is not assignable to type 'number'.")
		})

		it("validated default in scope", () => {
			const types = scope({
				specialNumber: "number",
				stringDefault: { foo: "string", bar: "specialNumber = 5" },
				tupleDefault: { foo: "string", bar: ["specialNumber", "=", 5] }
			}).export()

			attest<{
				foo: string
				bar: (In?: number | undefined) => Default<5>
			}>(types.stringDefault.t)

			attest<typeof types.stringDefault.t>(types.tupleDefault.t)

			attest(types.stringDefault.json).snap({
				required: [{ key: "foo", value: "string" }],
				optional: [
					{
						default: 5,
						key: "bar",
						value: { domain: "number", meta: { default: 5 } }
					}
				],
				domain: "object"
			})

			attest(types.tupleDefault.json).equals(types.stringDefault.json)
		})

		it("chained", () => {
			const defaultedString = type("string").default("")
			attest(defaultedString.t).type.toString.snap(
				'(In?: string | undefined) => Default<"">'
			)
			attest(defaultedString.json).snap({
				domain: "string",
				meta: { default: "" }
			})

			const o = type({ a: defaultedString })
			attest(o.t).type.toString.snap(
				'{ a: (In?: string | undefined) => Default<""> }'
			)
			attest<{ a?: string }>(o.inferIn)
			attest<{ a: string }>(o.infer)
			attest(o.json).snap({
				optional: [
					{
						default: "",
						key: "a",
						value: { domain: "string", meta: { default: "" } }
					}
				],
				domain: "object"
			})
		})
	})

	describe("string parsing", () => {
		it("number", () => {
			const t = type({ key: "number = 42" })
			const expected = type({ key: ["number", "=", 42] })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("bigint", () => {
			const t = type({ key: "bigint = 100n" })
			const expected = type({ key: ["bigint", "=", 100n] })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("string", () => {
			const t = type({ key: 'string = "default value"' })
			const expected = type({ key: ["string", "=", "default value"] })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("Date", () => {
			const t = type({ key: 'Date = d"1993-05-21"' })

			const out = t.assert({})

			// pass the same date instance back
			const expected = type({ key: ["Date", "=", out.key] })

			// we can't check expected here since the Date instance will not
			// have a narrowed literal type
			attest<{
				key: (In?: Date) => Default<Date.literal<"1993-05-21">>
			}>(t.t)
			attest(t.json).equals(expected.json)
		})

		it("true", () => {
			const t = type({ key: "boolean = true" })
			const expected = type({ key: ["boolean", "=", true] })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("false", () => {
			const t = type({ key: "boolean = false" })
			const expected = type({ key: ["boolean", "=", false] })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("null", () => {
			const t = type({ key: "object | null = null" })
			const expected = type({ key: ["object | null", "=", null] })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("undefined", () => {
			const t = type({ key: "unknown = undefined" })
			const expected = type({ key: ["unknown", "=", undefined] })

			attest(t({})).snap({ key: "(undefined)" })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("incorrect default type", () => {
			// @ts-expect-error
			attest(() => type({ foo: "string", bar: "number = true" }))
				.throws.snap(
					'ParseError: Default value for key "bar" must be a number (was boolean)'
				)
				.type.errors("true is not assignable to number")
		})

		it("non-literal", () => {
			attest(() =>
				// @ts-expect-error
				type({ foo: "string", bar: "unknown = number" })
			).throwsAndHasTypeError(writeNonLiteralDefaultMessage("number"))
		})

		it("validated default in scope", () => {
			const $ = scope({
				specialNumber: "number",
				obj: { foo: "string", bar: "specialNumber = 5" }
			})

			$.export()

			attest($.json).snap({
				specialNumber: { domain: "number" },
				obj: {
					required: [{ key: "foo", value: "string" }],
					optional: [
						{
							default: 5,
							key: "bar",
							value: { domain: "number", meta: { default: 5 } }
						}
					],
					domain: "object"
				}
			})
		})

		it("optional with default", () => {
			const t = type({ foo: "string", "bar?": "number = 5" })
			attest<{
				foo: string
				bar?: number
			}>(t.inferIn)
			attest<{
				foo: string
				bar?: number
			}>(t.infer)

			const fromTuple = type({ foo: "string", "bar?": ["number", "=", 5] })
			attest<typeof t.t>(fromTuple.t)
			attest(fromTuple.json).equals(t.json)
		})

		it("shallow default", () => {
			const t = type("string='foo'")
			const expected = type("string").default("foo")
			attest<typeof expected.t>(t.t)
			attest(t.json).equals(expected.json)
		})
	})

	describe("intersection", () => {
		it("two optionals, one default", () => {
			const l = type({ bar: ["number", "=", 5] })
			const r = type({ "bar?": "5" })

			const result = l.and(r)
			attest(result.json).snap({
				optional: [{ default: 5, key: "bar", value: { unit: 5 } }],
				domain: "object"
			})
		})

		it("same default", () => {
			const l = type({ bar: ["number", "=", 5] })
			const r = type({ bar: ["5", "=", 5] })

			const result = l.and(r)
			attest(result.json).snap({
				optional: [
					{ default: 5, key: "bar", value: { unit: 5, meta: { default: 5 } } }
				],
				domain: "object"
			})
		})

		it("removed when intersected with required", () => {
			const l = type({ bar: ["number", "=", 5] })
			const r = type({ bar: "number" })

			const result = l.and(r)
			attest(result.json).snap({
				required: [{ key: "bar", value: "number" }],
				domain: "object"
			})
		})

		it("errors on multiple defaults", () => {
			const l = type({ bar: ["number", "=", 5] })
			const r = type({ bar: ["number", "=", 6] })
			attest(() => l.and(r)).throws.snap(
				"ParseError: Invalid intersection of default values 5 & 6"
			)
		})
	})
})

import { attest, contextualize } from "@ark/attest"
import { writeUnassignableDefaultValueMessage } from "@ark/schema"
import { scope, type } from "arktype"
import type { Date } from "arktype/internal/keywords/constructors/Date.ts"
import type {
	InferredDefault,
	Out,
	string
} from "arktype/internal/keywords/inference.ts"
import { writeNonLiteralDefaultMessage } from "arktype/internal/parser/shift/operator/default.ts"

contextualize(() => {
	describe("parsing and traversal", () => {
		it("base", () => {
			const o = type({ foo: "string", bar: ["number", "=", 5] })

			// ensure type ast displays is exactly as expected
			attest(o.t).type.toString.snap("{ foo: string; bar: defaultsTo<5> }")
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
				.throws(
					writeUnassignableDefaultValueMessage(
						"must be a number (was a string)"
					)
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
				bar: InferredDefault<number, 5>
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
			attest(defaultedString.t).type.toString.snap('defaultsTo<"">')
			attest(defaultedString.json).snap({
				domain: "string",
				meta: { default: "" }
			})

			const o = type({ a: defaultedString })
			attest(o.t).type.toString.snap('{ a: defaultsTo<""> }')
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

		it("invalid chained", () => {
			// @ts-expect-error
			attest(() => type("number").default(true))
				.throws(
					writeUnassignableDefaultValueMessage("must be a number (was boolean)")
				)
				.type.errors(
					"'boolean' is not assignable to parameter of type 'number'"
				)
		})

		it("spread", () => {
			const t = type("number", "=", 5)

			const expected = type(["number", "=", 5])
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("invalid spread", () => {
			// @ts-expect-error
			attest(() => type("number", "=", true))
				.throws(
					writeUnassignableDefaultValueMessage("must be a number (was boolean)")
				)
				.type.errors(
					"'boolean' is not assignable to parameter of type 'number'"
				)
		})

		it("morphed", () => {
			// https://discord.com/channels/957797212103016458/1280932672029593811/1283368602355109920
			const processForm = type({
				bool_value: type("string")
					.pipe(v => (v === "on" ? true : false))
					.default("off")
			})

			attest<{
				bool_value: (In: string.defaultsTo<"off">) => Out<boolean>
			}>(processForm.t)
			attest<{
				// key should still be distilled as optional even inside a morph
				bool_value?: string
			}>(processForm.inferIn)
			attest<{
				bool_value: boolean
			}>(processForm.infer)

			const out = processForm({})

			attest(out).snap({ bool_value: false })

			attest(processForm({ bool_value: "on" })).snap({ bool_value: true })

			attest(processForm({ bool_value: true }).toString()).snap(
				"bool_value must be a string (was boolean)"
			)
		})

		it("morphed from defaulted", () => {
			const processForm = type({
				bool_value: type("string='off'").pipe(v => (v === "on" ? true : false))
			})

			attest<{
				bool_value: (In: string.defaultsTo<"off">) => Out<boolean>
			}>(processForm.t)

			const out = processForm({})

			attest(out).snap({ bool_value: false })

			attest(processForm({ bool_value: "on" })).snap({ bool_value: true })

			attest(processForm({ bool_value: true }).toString()).snap(
				"bool_value must be a string (was boolean)"
			)
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
				key: InferredDefault<Date, Date.literal<"1993-05-21">>
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

			attest(t({})).snap({ key: undefined })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("incorrect default type", () => {
			// @ts-expect-error
			attest(() => type({ foo: "string", bar: "number = true" }))
				.throws(
					writeUnassignableDefaultValueMessage("must be a number (was boolean)")
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

		it("extracts output as required", () => {
			const t = type({
				foo: "string = 'foo'"
			})

			attest<{ foo?: string }>(t.in.infer)
			attest<{ foo: string }>(t.out.infer)
			attest(t.in.expression).snap('{ foo?: string = "foo" }')
			attest(t.out.expression).snap("{ foo: string }")
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

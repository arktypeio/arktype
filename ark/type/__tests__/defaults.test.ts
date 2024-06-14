import { attest, contextualize } from "@arktype/attest"
import type { Default } from "@arktype/schema"
import { scope, type } from "arktype"
import { invalidDefaultKeyKindMessage } from "../parser/objectLiteral.js"

contextualize(
	"parsing and traversal",
	() => {
		it("base", () => {
			const o = type({ foo: "string", bar: ["number", "=", 5] })

			// ensure type ast displays is exactly as expected
			attest(o.t).type.toString.snap(
				"{ foo: string; bar: (In?: number | undefined) => Default<5>; }"
			)
			attest<{ foo: string; bar?: number }>(o.inferIn)
			attest<{ foo: string; bar: number }>(o.infer)

			attest(o.json).snap({
				required: [{ key: "foo", value: "string" }],
				optional: [{ default: 5, key: "bar", value: "number" }],
				domain: "object"
			})

			attest(o({ foo: "", bar: 4 })).equals({ foo: "", bar: 4 })
			attest(o({ foo: "" })).equals({ foo: "", bar: 5 })
			attest(o({ bar: 4 }).toString()).snap(
				"foo must be a string (was missing)"
			)
			attest(o({ foo: "", bar: "" }).toString()).snap(
				"bar must be a number (was string)"
			)
		})

		it("defined with wrong type", () => {
			attest(() =>
				// @ts-expect-error
				type({ foo: "string", bar: ["number", "=", "5"] })
			)
				.throws.snap(
					'ParseError: Default value at "bar" must be a number (was string)'
				)
				.type.errors("Type 'string' is not assignable to type 'number'")
		})

		it("optional with default", () => {
			attest(() =>
				// @ts-expect-error
				type({ foo: "string", "bar?": ["number", "=", 5] })
			).throwsAndHasTypeError(invalidDefaultKeyKindMessage)
		})
	},
	"string parsing",
	() => {
		it("can parse a serializable default from a string", () => {
			const t = type({ foo: "string", bar: "number = 5" })
			const expected = type({ foo: "string", bar: ["number", "=", 5] })

			attest<{
				foo: string
				bar: (In?: number) => Default<5>
			}>(t.t)

			attest(t.json).equals(expected.json)
		})

		it("incorrect default type", () => {
			attest(() =>
				// @ts-expect-error
				type({ foo: "string", bar: "number = true" })
			)
				.throws.snap()
				.type.errors.snap()
		})

		it("non-literal", () => {
			attest(() =>
				// @ts-expect-error
				type({ foo: "string", bar: "unknown = number" })
			)
				.throws.snap()
				.type.errors.snap()
		})

		// TODO: this is currently broken due to a workaround in
		// validateDefaultValueString to prevent cyclic inference from breaking

		// it("validated default in scope", () => {
		// 	const $ = scope({
		// 		specialNumber: "number",
		// 		obj: { foo: "string", bar: "specialNumber =5" }
		// 	})
		// })

		// it("allows whitespace surrounding =", () => {
		// 	const whitespace = type({ foo: "string = 'foo'" })
		// 	const noWhitespace = type({ foo: "string='foo'" })

		// 	attest<typeof whitespace>(noWhitespace).equals(whitespace)
		// })

		it("optional with default", () => {
			attest(() =>
				// @ts-expect-error
				type({ foo: "string", "bar?": "number = 5" })
			).throwsAndHasTypeError(invalidDefaultKeyKindMessage)
		})
	},
	"intersection",
	() => {
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
				optional: [{ default: 5, key: "bar", value: { unit: 5 } }],
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
	}
)

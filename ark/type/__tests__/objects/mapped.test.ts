import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import type { Default } from "arktype/internal/keywords/inference.ts"

contextualize(() => {
	it("identity", () => {
		const original = type({
			"foo?": "string",
			bar: "number",
			baz: "boolean"
		})
		const t = original.map(entry => entry)

		attest<typeof original>(t)
		attest(t.expression).equals(original.expression)
	})

	it("change one value", () => {
		const original = type({
			"foo?": "string",
			bar: "number",
			baz: "boolean"
		})
		const withNullableBar = original.map(prop => {
			if (prop.key === "bar") {
				// due to a TS bug, this has to be assigned to a variable,
				// otherwise the | null is not inferred
				const nullableBar = prop.value.or("null")
				return {
					key: prop.key,
					value: nullableBar
				}
			}
			return prop
		})

		const expected = type({
			"foo?": "string",
			bar: "number | null",
			baz: "boolean"
		})

		attest<typeof expected>(withNullableBar)
		attest(withNullableBar.expression).equals(expected.expression)
	})

	it("change optionality", () => {
		const original = type({
			"foo?": "string",
			bar: "number",
			baz: "boolean"
		})

		const t = original.map(prop => {
			if (prop.key === "foo")
				return { kind: "required", key: "foo", value: prop.value } as const
			if (prop.key === "bar")
				return { kind: "optional", key: "bar", value: prop.value } as const

			return prop
		})

		const expected = type({
			foo: "string",
			"bar?": "number",
			baz: "boolean"
		})

		attest<typeof expected>(t)
		attest(t.expression).equals(expected.expression)
	})

	it("modify default", () => {
		const original = type({
			foo: "string = 'foo'",
			"bar?": "number"
		})

		attest<{
			foo: (In?: string | undefined) => Default<"foo">
			bar?: number
		}>(original.t)
		attest(original.expression).snap('{ foo?: string = "foo", bar?: number }')

		const t = original.map(prop => {
			if (prop.key === "foo") {
				return {
					...prop,
					default: `${prop.default}t` as const
				}
			}
			return prop
		})

		attest<{
			bar?: number
			foo: (In?: string | undefined) => Default<"foot">
		}>(t.t)
		attest(t.expression).snap('{ foo?: string = "foot", bar?: number }')
	})
})

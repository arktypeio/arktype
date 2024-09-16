import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

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
		const withNullableBar = original.map(entry => {
			if (entry[0] === "bar") {
				const nullableBar = entry[1].or("null")
				return [entry[0], nullableBar]
			}
			return entry
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

		const t = original.map(entry => {
			if (entry[0] === "foo") return ["foo", entry[1], "required"] as const
			if (entry[0] === "bar") return ["bar", entry[1], "optional"] as const

			return entry
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
			bar: "number"
		})

		const t = original.map(entry => {
			if (entry[0] === "foo")
				return [entry[0], entry[1], "optional", { default: entry[3].default }]
		})
	})
})

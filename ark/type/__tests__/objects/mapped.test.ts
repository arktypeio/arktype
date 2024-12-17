import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import type { Default } from "arktype/internal/attributes.ts"

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

	it("change values", () => {
		const original = type({
			"foo?": "string",
			bar: "number",
			baz: {
				inner: "string"
			}
		})

		const t = original.map(prop => {
			if (prop.key === "foo") {
				return {
					key: prop.key,
					value: prop.value.array().atLeastLength(1)
				}
			}
			if (prop.key === "bar") {
				return {
					key: prop.key,
					value: prop.value.or("null")
				}
			}
			if (prop.key === "baz") {
				return {
					key: prop.key,
					value: prop.value.and({
						intersectedInner: "number"
					})
				}
			}
			return prop
		})

		const expected = type({
			"foo?": "string[] >= 1",
			bar: "number | null",
			baz: {
				inner: "string",
				intersectedInner: "number"
			}
		})

		attest<typeof expected>(t)
		attest(t.expression).equals(expected.expression)
	})

	it("filter and split values", () => {
		const original = type({
			"foo?": "string",
			bar: "number",
			baz: {
				inner: "string"
			}
		})

		const getInner = (data: typeof original.infer.baz) => data.inner

		const t = original.map(prop => {
			if (prop.key === "bar") return []

			if (prop.key === "baz") {
				return [
					prop,
					{
						key: "fromBaz" as const,
						value: prop.value.pipe(getInner)
					}
				]
			}
			return prop
		})

		const expected = type({
			"foo?": "string",
			baz: {
				inner: "string"
			},
			fromBaz: original.get("baz").pipe(getInner)
		})

		attest<typeof expected>(t)
		attest(t.expression).equals(expected.expression)
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
			foo: Default<string, "foo">
			bar?: number
		}>(original.t)
		attest(original.expression).snap('{ foo: string = "foo", bar?: number }')

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
			foo: Default<string, "foot">
		}>(t.t)
		attest(t.expression).snap('{ foo?: string = "foot", bar?: number }')
	})
})

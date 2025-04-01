import { attest, contextualize } from "@ark/attest"
import type { anyOrNever, Fn, propValueOf } from "@ark/util"
import { declare, type } from "arktype"
import type { Default } from "arktype/internal/attributes.ts"

contextualize(() => {
	it("identity", () => {
		const Original = type({
			"foo?": "string",
			bar: "number",
			baz: "boolean"
		})
		const T = Original.map(entry => entry)

		attest<typeof Original>(T)
		attest(T.expression).equals(Original.expression)
	})

	it("change values", () => {
		const Original = type({
			"foo?": "string",
			bar: "number",
			baz: {
				inner: "string"
			}
		})

		const T = Original.map(prop => {
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

		const Expected = type({
			"foo?": "string[] >= 1",
			bar: "number | null",
			baz: {
				inner: "string",
				intersectedInner: "number"
			}
		})

		attest<typeof Expected>(T)
		attest(T.expression).equals(Expected.expression)
	})

	it("infer method output", () => {
		type ExpectedKey<t = type<object>> =
			| propValueOf<{
					[k in keyof t as t[k] extends Fn<never, type.Any> ?
						[t[k]] extends [Fn<never, anyOrNever>] ?
							never
						:	k
					:	never]: k
			  }>
			| "to"
			| "get"
			| "pipe"

		const Base = type({ base: "1" })

		type Base = typeof Base.infer

		type Original = { [k in ExpectedKey]: Base }

		const Original = declare<Original>().type({
			and: Base,
			array: Base,
			as: Base,
			brand: Base,
			configure: Base,
			describe: Base,
			exclude: Base,
			extract: Base,
			filter: Base,
			get: Base,
			keyof: Base,
			map: Base,
			merge: Base,
			narrow: Base,
			omit: Base,
			onDeepUndeclaredKey: Base,
			onUndeclaredKey: Base,
			or: Base,
			partial: Base,
			pick: Base,
			pipe: Base,
			readonly: Base,
			required: Base,
			to: Base
		})

		const brand = Base.brand("brand")

		const filterFn = (v: Base): v is Base & { filter: 1 } => true
		const narrowFn = (v: Base): v is Base & { narrow: 1 } => true
		const pipeFn = () => ({ pipe: 1 })

		const Expected = type({
			and: { base: "1", and: "1" },
			array: Base.array(),
			as: Base.as<{ as: 1 }>(),
			brand,
			configure: Base.configure({ description: "" }),
			describe: Base.describe(""),
			exclude: { exclude: "1" },
			extract: { extract: "1" },
			filter: [Base, ":", filterFn],
			get: "1",
			keyof: "'base'",
			map: { base: "2" },
			merge: { base: "1", merge: "1" },
			narrow: [Base, ":", narrowFn],
			omit: {},
			onDeepUndeclaredKey: { "+": "reject", base: "1" },
			onUndeclaredKey: { "+": "reject", base: "1" },
			or: [Base, "|", { or: "1" }],
			partial: { "base?": "1" },
			pick: { pick: "1" },
			pipe: [Base, "=>", pipeFn],
			readonly: Base.readonly(),
			required: { base: "1", required: "1" },
			to: { base: "1", to: "1" }
		})

		const mapped = Original.map(prop => {
			switch (prop.key) {
				case "and":
					return {
						key: prop.key,
						value: prop.value.and({ and: "1" })
					}
				case "array":
					return {
						key: prop.key,
						value: prop.value.array()
					}
				case "as":
					return {
						key: prop.key,
						value: prop.value.as<{ as: 1 }>()
					}
				case "brand":
					return {
						key: prop.key,
						value: prop.value.brand("brand")
					}
				case "configure":
					return {
						key: prop.key,
						value: prop.value.configure({ description: "" })
					}
				case "describe":
					return {
						key: prop.key,
						value: prop.value.describe("")
					}
				case "exclude":
					return {
						key: prop.key,
						value: prop.value.or({ exclude: "1" }).exclude(Base)
					}
				case "extract":
					return {
						key: prop.key,
						value: prop.value.or({ extract: "1" }).extract({ extract: "1" })
					}
				case "filter":
					return {
						key: prop.key,
						value: prop.value.filter(filterFn)
					}
				case "get":
					return {
						key: prop.key,
						value: prop.value.get("base")
					}
				case "keyof":
					return {
						key: prop.key,
						value: prop.value.keyof()
					}
				case "map":
					return {
						key: prop.key,
						value: prop.value.map(innerProp => ({
							key: innerProp.key,
							value: type("2")
						}))
					}
				case "merge":
					return {
						key: prop.key,
						value: prop.value.merge({
							merge: "1"
						})
					}
				case "narrow":
					return {
						key: prop.key,
						value: prop.value.narrow(narrowFn)
					}
				case "omit":
					return {
						key: prop.key,
						value: prop.value.omit("base")
					}
				case "onDeepUndeclaredKey":
					return {
						key: prop.key,
						value: prop.value.onDeepUndeclaredKey("reject")
					}
				case "onUndeclaredKey":
					return {
						key: prop.key,
						value: prop.value.onUndeclaredKey("reject")
					}
				case "or":
					return {
						key: prop.key,
						value: prop.value.or({ or: "1" })
					}
				case "partial":
					return {
						key: prop.key,
						value: prop.value.partial()
					}
				case "pick":
					return {
						key: prop.key,
						value: prop.value.and({ pick: "1" }).pick("pick")
					}
				case "pipe":
					return {
						key: prop.key,
						value: prop.value.pipe(pipeFn)
					}
				case "readonly":
					return {
						key: prop.key,
						value: prop.value.readonly()
					}
				case "required":
					return {
						key: prop.key,
						value: prop.value.and({ "required?": "1" }).required()
					}
				case "to":
					return {
						key: prop.key,
						value: prop.value.to({ to: "1" })
					}
				default:
					prop satisfies never
					return prop
			}
		})

		attest<typeof Expected.t>(mapped.t)
		attest(mapped.json).equals(Expected.json)
	})

	it("filter and split values", () => {
		const Original = type({
			"foo?": "string",
			bar: "number",
			baz: {
				inner: "string"
			}
		})

		const getInner = (data: typeof Original.infer.baz) => data.inner

		const T = Original.map(prop => {
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

		const Expected = type({
			"foo?": "string",
			baz: {
				inner: "string"
			},
			fromBaz: Original.get("baz").pipe(getInner)
		})

		attest<typeof Expected>(T)
		attest(T.expression).equals(Expected.expression)
	})

	it("change optionality", () => {
		const Original = type({
			"foo?": "string",
			bar: "number",
			baz: "boolean"
		})

		const T = Original.map(prop => {
			if (prop.key === "foo")
				return { kind: "required", key: "foo", value: prop.value } as const
			if (prop.key === "bar")
				return { kind: "optional", key: "bar", value: prop.value } as const

			return prop
		})

		const Expected = type({
			foo: "string",
			"bar?": "number",
			baz: "boolean"
		})

		attest<typeof Expected>(T)
		attest(T.expression).equals(Expected.expression)
	})

	it("modify default", () => {
		const Original = type({
			foo: "string = 'foo'",
			"bar?": "number"
		})

		attest<{
			foo: Default<string, "foo">
			bar?: number
		}>(Original.t)
		attest(Original.expression).snap('{ foo: string = "foo", bar?: number }')

		const T = Original.map(prop => {
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
		}>(T.t)
		attest(T.expression).snap('{ foo: string = "foot", bar?: number }')
	})
})

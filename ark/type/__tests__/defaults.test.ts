import { attest, contextualize } from "@ark/attest"
import {
	registeredReference,
	writeNonPrimitiveNonFunctionDefaultValueMessage
} from "@ark/schema"
import { deepClone } from "@ark/util"
import { scope, type } from "arktype"
import type { Default, Out, To } from "arktype/internal/attributes.ts"
import { shallowDefaultableMessage } from "arktype/internal/parser/ast/validate.ts"
import { invalidDefaultableKeyKindMessage } from "arktype/internal/parser/property.ts"
import { writeNonLiteralDefaultMessage } from "arktype/internal/parser/shift/operator/default.ts"

contextualize(() => {
	describe("parsing and traversal", () => {
		it("base", () => {
			const fnDefaultTo5 = () => 5 as const
			const o = type({
				a: "string",
				foo: "number = 5",
				bar: ["number", "=", 5],
				baz: ["number", "=", fnDefaultTo5]
			})

			attest(o.t).type.toString.snap(`{
    a: string
    foo: Default<number, 5>
    bar: Default<number, 5>
    baz: Default<number, 5>
}`)
			attest<{
				a: string
				foo?: number
				bar?: number
				baz?: number
			}>(o.inferIn)
			attest<{ a: string; foo: number; bar: number; baz: number }>(o.infer)

			attest(o.json).snap({
				required: [{ key: "a", value: "string" }],
				optional: [
					{ default: "$ark.fnDefaultTo5", key: "baz", value: "number" },
					{ default: 5, key: "bar", value: "number" },
					{ default: 5, key: "foo", value: "number" }
				],
				domain: "object"
			})

			attest(o({ a: "", foo: 4, bar: 4, baz: 4 })).equals({
				a: "",
				foo: 4,
				bar: 4,
				baz: 4
			})
			attest(o({ a: "" })).equals({ a: "", foo: 5, bar: 5, baz: 5 })
			attest(o({ bar: 4 }).toString()).snap("a must be a string (was missing)")
			attest(o({ a: "", bar: "" }).toString()).snap(
				"bar must be a number (was a string)"
			)
		})

		it("unions are defaultable", () => {
			const o = type({
				boo: "boolean = false"
			})
			// this should not distribute to Default<true, true> | Default<false, true>
			attest(o).type.toString.snap("Type<{ boo: Default<boolean, false> }, {}>")
			attest(o.json).snap({
				optional: [
					{
						default: false,
						key: "boo",
						value: [{ unit: false }, { unit: true }]
					}
				],
				domain: "object"
			})

			attest(o({})).snap({ boo: false })
			attest(o({ boo: true })).snap({ boo: true })
			attest(o({ boo: 5 }).toString()).snap("boo must be boolean (was 5)")
		})

		it("validated default in scope", () => {
			const types = scope({
				specialNumber: "number",
				stringDefault: { foo: "string", bar: "specialNumber = 5" },
				tupleDefault: { foo: "string", bar: ["specialNumber", "=", 5] }
			}).export()

			attest<{
				foo: string
				bar: Default<number, 5>
			}>(types.stringDefault.t)

			attest<typeof types.stringDefault.t>(types.tupleDefault.t)

			attest(types.stringDefault.json).snap({
				required: [{ key: "foo", value: "string" }],
				optional: [
					{
						default: 5,
						key: "bar",
						value: "number"
					}
				],
				domain: "object"
			})

			attest(types.tupleDefault.json).equals(types.stringDefault.json)
		})

		it("no shallow default in tuple expression", () => {
			attest(() =>
				// @ts-expect-error
				type(["string = 'foo'", "|", "number"])
			).throwsAndHasTypeError(shallowDefaultableMessage)

			attest(() =>
				// @ts-expect-error
				type(["string", "|", ["number", "=", 5]])
			).throwsAndHasTypeError(shallowDefaultableMessage)
		})

		it("no shallow default in scope", () => {
			// @ts-expect-error
			attest(() => scope({ foo: "string = ''" })).throwsAndHasTypeError(
				shallowDefaultableMessage
			)

			// @ts-expect-error
			attest(() => scope({ foo: ["string", "=", ""] })).throwsAndHasTypeError(
				shallowDefaultableMessage
			)
		})

		it("chained", () => {
			const defaultedString = type("string").default("")
			attest(defaultedString).type.toString.snap('[Type<string, {}>, "=", ""]')

			const o = type({ a: defaultedString })
			attest(o.t).type.toString.snap('{ a: Default<string, ""> }')
			attest<{ a?: string }>(o.inferIn)
			attest<{ a: string }>(o.infer)
			attest(o.json).snap({
				optional: [
					{
						default: "",
						key: "a",
						value: "string"
					}
				],
				domain: "object"
			})
		})

		it("unassignable default tuple", () => {
			attest(() =>
				// @ts-expect-error
				type({ foo: "string", bar: ["number", "=", "5"] })
			)
				.throws.snap(
					"ParseError: Default for bar must be a number (was a string)"
				)
				.type.errors(
					"Type 'string' is not assignable to type 'DefaultFor<number>'."
				)
		})

		it("unassignable default thunk tuple", () => {
			attest(() =>
				type({
					foo: [
						{ foo: "true" },
						"=",
						() => ({
							// @ts-expect-error
							foo: false
						})
					]
				})
			)
				.throws.snap("ParseError: Default for foo.foo must be true (was false)")
				.type.errors.snap("Type 'false' is not assignable to type 'true'")
		})

		it("unassignable default string", () => {
			// @ts-expect-error
			attest(() => type({ foo: "number = true" }))
				.throws.snap(
					"ParseError: Default for foo must be a number (was boolean)"
				)
				.type.errors.snap("Default value true is not assignable to number ")
		})

		it("morphed", () => {
			// https://discord.com/channels/957797212103016458/1280932672029593811/1283368602355109920
			const processForm = type({
				bool_value: type("string")
					.pipe(v => (v === "on" ? true : false))
					.default("off")
			})

			attest<{
				bool_value: (In: Default<string, "off">) => Out<boolean>
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

		it("primitive morph precomputed", () => {
			let callCount = 0

			const toggle = (b: boolean) => {
				callCount++
				return !b
			}

			const toggleRef = registeredReference(toggle)

			const t = type({
				blep: type("boolean").pipe(toggle).default(false)
			})

			attest(t.t).type.toString.snap(`{
	blep: (In: of<boolean, Default<false>>) => Out<boolean>
}`)

			attest(t.json).snap({
				optional: [
					{
						default: false,
						key: "blep",
						value: {
							in: [{ unit: false }, { unit: true }],
							morphs: [toggleRef]
						}
					}
				],
				domain: "object"
			})

			const out = t({})

			attest(out).snap({ blep: true })
			attest(callCount).equals(1)

			t({})
			attest(callCount).equals(1)
		})

		it("default preserved on pipe to node", () => {
			let callCount = 0

			const toggle = (b: boolean) => {
				callCount++
				return !b
			}

			const toggleRef = registeredReference(toggle)

			const t = type({
				blep: type("boolean").pipe(toggle).to("boolean").default(false)
			})

			attest(t.t).type.toString.snap(`{
    blep: (In: boolean) => To<boolean>;
}`)

			attest(t.json).snap({
				optional: [
					{
						default: false,
						key: "blep",
						value: {
							in: [{ unit: false }, { unit: true }],
							morphs: [toggleRef, [{ unit: false }, { unit: true }]]
						}
					}
				],
				domain: "object"
			})

			const out = t({})

			attest(out).snap({ blep: true })
			attest(callCount).equals(1)

			t({})
			attest(callCount).equals(1)
		})

		it("primitive morphed to object not premorphed", () => {
			const t = type({
				foo: type("string")
					.pipe(s => ({ nest: s }))
					.default("foo")
			})
			attest<{
				foo: (In: Default<string, "foo">) => Out<{
					nest: string
				}>
			}>(t.t)

			const out = t.assert({})

			attest(out).snap({ foo: { nest: "foo" } })

			const originalOut = deepClone(out)

			out.foo.nest = "baz"

			attest(t({})).equals(originalOut)
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

			attest(out.key.toISOString()).snap("1993-05-21T00:00:00.000Z")

			// we can't check expected here since the Date instance will not
			// have a narrowed literal type
			attest<{
				key: Default<Date, Date>
			}>(t.t)
		})

		it("Date is immutable", () => {
			const t = type({ date: 'Date = d"1993-05-21"' })
			const v1 = t.assert({})
			const time = v1.date.getTime()
			v1.date.setMilliseconds(123)
			const v2 = t.assert({})
			attest(v2.date.getTime()).equals(time)
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
			// ideally we could infer a better type here,
			// but attaching attributes to null or undefined
			// is not possible with the current design
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
				.throws.snap(
					"ParseError: Default for bar must be a number (was boolean)"
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
				specialNumber: {
					domain: "number"
				},
				obj: {
					required: [{ key: "foo", value: "string" }],
					optional: [
						{
							default: 5,
							key: "bar",
							value: "number"
						}
					],
					domain: "object"
				}
			})
		})

		it("optional with default", () => {
			attest(() =>
				// @ts-expect-error
				type({ foo: "string", "bar?": "number = 5" })
			).throwsAndHasTypeError(invalidDefaultableKeyKindMessage)

			attest(() =>
				// @ts-expect-error
				type({ foo: "string", "bar?": ["number", "=", 5] })
			).throwsAndHasTypeError(invalidDefaultableKeyKindMessage)
		})

		it("index with default", () => {
			attest(() =>
				// @ts-expect-error
				type({ foo: "string", "[string]": "number = 5" })
			).throwsAndHasTypeError(invalidDefaultableKeyKindMessage)

			attest(() =>
				// @ts-expect-error
				type({ foo: "string", "[string]": ["number", "=", 5] })
			).throwsAndHasTypeError(invalidDefaultableKeyKindMessage)
		})

		it("shallow default", () => {
			// @ts-expect-error
			attest(() => type("string='foo'")).throwsAndHasTypeError(
				shallowDefaultableMessage
			)

			// @ts-expect-error
			attest(() => type(["string", "=", "foo"])).throwsAndHasTypeError(
				shallowDefaultableMessage
			)
		})

		it("extracts output as required", () => {
			const t = type({
				foo: "string = 'foo'"
			})

			attest<{ foo?: string }>(t.in.infer)
			attest<{ foo: string }>(t.out.infer)
			attest(t.in.expression).snap('{ foo: string = "foo" }')
			attest(t.out.expression).snap("{ foo: string }")
		})
	})

	describe("works properly with types", () => {
		it("allows primitives and factories for anys", () => {
			const fn = () => {}
			const t = type({
				foo1: ["unknown", "=", true],
				bar1: ["unknown", "=", () => [true]],
				baz1: ["unknown", "=", () => fn],
				foo2: ["unknown.any", "=", true],
				bar2: ["unknown.any", "=", () => [true]],
				baz2: ["unknown.any", "=", () => fn]
			})
			const out = t.assert({})
			attest(out).snap({
				foo1: true,
				bar1: [true],
				baz1: fn,
				foo2: true,
				bar2: [true],
				baz2: fn
			})
		})
		it("disallows plain objects for anys", () => {
			attest(() => {
				// @ts-expect-error
				type({ foo: ["unknown", "=", { foo: "bar" }] })
			})
				.throws(writeNonPrimitiveNonFunctionDefaultValueMessage("foo"))
				.type.errors("'foo' does not exist in type '() => unknown'.")

			attest(() => {
				// @ts-expect-error
				type({ foo: ["unknown.any", "=", { foo: "bar" }] })
			})
				.throws(writeNonPrimitiveNonFunctionDefaultValueMessage("foo"))
				.type.errors("'foo' does not exist in type '() => any'.")
		})

		it("allows string sybtyping", () => {
			type({
				foo: [/^foo/ as type.cast<`foo${string}`>, "=", "foobar"],
				bar: [/bar$/ as type.cast<`${string}bar`>, "=", () => "foobar" as const]
			})
		})

		it("shows types plainly", () => {
			attest(
				// @ts-expect-error
				() => type({ foo: ["number", "=", true] })
			)
				.throws()
				.type.errors.snap(
					"Type 'boolean' is not assignable to type 'DefaultFor<number>'."
				)
			attest(
				// @ts-expect-error
				() => type({ foo: ["number[]", "=", true] })
			)
				.throws()
				.type.errors.snap(
					"Type 'boolean' is not assignable to type '() => number[]'."
				)
			attest(
				// @ts-expect-error
				() => type({ foo: [{ bar: "false" }, "=", true] })
			)
				.throws()
				.type.errors.snap(
					"Type 'boolean' is not assignable to type '() => { bar: false; }'."
				)
			attest(
				// @ts-expect-error
				() => type({ foo: [["number[]", "|", "string"], "=", true] })
			)
				.throws()
				.type.errors.snap(
					"Type 'boolean' is not assignable to type 'DefaultFor<string | number[]>'."
				)
			attest(
				// @ts-expect-error
				() => type(["number[]", "|", "string"], "=", true)
			)
				.throws()
				.type.errors.snap(
					"Argument of type 'boolean' is not assignable to parameter of type 'DefaultFor<string | number[]>'."
				)
			// should not cause "instantiation is excessively deep"
			attest(
				// @ts-expect-error
				() => type("number[]", "|", "string").default(true)
			)
				.throws()
				.type.errors.snap(
					"Argument of type 'boolean' is not assignable to parameter of type 'DefaultFor<string | number[]>'."
				)
			// should not cause "instantiation is excessively deep"
			attest(
				// @ts-expect-error
				() => type("number[]", "|", "string").default(() => true)
			)
				.throws()
				.type.errors(
					"Type 'boolean' is not assignable to type 'string | number[]'."
				)
		})

		it("uses input type for morphs", () => {
			// @ts-expect-error
			attest(() => type({ foo: ["string.numeric.parse = true"] }))
				.throws("must be a string (was boolean)")
				.type.errors(
					"Default value true is not assignable to string.numeric.parse"
				)
			// @ts-expect-error
			attest(() => type({ foo: ["string.numeric.parse", "=", true] }))
				.throws("must be a string (was boolean)")
				.type.errors(
					"Type 'boolean' is not assignable to type 'DefaultFor<string>'."
				)
			// @ts-expect-error
			attest(() => type({ foo: ["string.numeric.parse", "=", () => true] }))
				.throws("must be a string (was boolean)")
				.type.errors("Type 'boolean' is not assignable to type 'string'.")
			const numtos = type("number").pipe(s => `${s}`)
			// @ts-expect-error
			attest(() => type({ foo: [numtos, "=", true] }))
				.throws("must be a number (was boolean)")
				.type.errors(
					"Type 'boolean' is not assignable to type 'DefaultFor<number>'."
				)
			// @ts-expect-error
			attest(() => type({ foo: [numtos, "=", () => true] }))
				.throws("must be a number (was boolean)")
				.type.errors("Type 'boolean' is not assignable to type 'number'.")

			const f = type({
				foo1: "string.numeric.parse = '123'",
				foo2: ["string.numeric.parse", "=", "123"],
				foo3: ["string.numeric.parse", "=", () => "123"],
				bar1: [numtos, "=", 123],
				bar2: [numtos, "=", () => 123],
				baz1: type(numtos).default(123)
			})
			attest(f.assert({})).snap({
				foo1: 123,
				foo2: 123,
				foo3: 123,
				bar1: "123",
				bar2: "123",
				baz1: "123"
			})
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
	})

	describe("functions", () => {
		it("works in tuple", () => {
			const t = type({ foo: ["string", "=", () => "bar" as const] })

			attest(t.t).type.toString(`{
    foo: Default<string, "bar">;
}`)
			attest(t.assert({ foo: "bar" })).snap({ foo: "bar" })
		})

		it("checks the returned value", () => {
			attest(() => {
				// @ts-expect-error
				type({ foo: ["number", "=", () => "bar"] })
			})
				.throws.snap(
					"ParseError: Default for foo must be a number (was a string)"
				)
				.type.errors("Type 'string' is not assignable to type 'number'.")

			attest(() => {
				// @ts-expect-error
				type({ foo: ["number[]", "=", () => "bar"] })
			})
				.throws.snap(
					"ParseError: Default for foo must be an array (was string)"
				)
				.type.errors.snap("Type 'string' is not assignable to type 'number[]'.")

			attest(() => {
				// @ts-expect-error
				type({ foo: [{ a: "number" }, "=", () => ({ a: "bar" })] })
			})
				.throws.snap(
					"ParseError: Default for foo.a must be a number (was a string)"
				)
				.type.errors.snap("Type 'string' is not assignable to type 'number'.")
		})

		it("morphs the returned value", () => {
			const t = type({ foo: ["string.numeric.parse", "=", () => "123"] })

			attest<{
				foo: (In: Default<string, string>) => To<number>
			}>(t.t)
			attest(t.assert({})).snap({ foo: 123 })
		})

		it("only allows argless functions for factories", () => {
			attest(() => {
				// @ts-expect-error
				type({ bar: ["Function", "=", class {}] })
			})
				.throws.snap(
					"TypeError: Class constructors cannot be invoked without 'new'"
				)
				.type.errors(
					"Type 'typeof (Anonymous class)' is not assignable to type '() => Function'"
				)
			attest(() => {
				// @ts-expect-error
				type({ bar: ["number", "=", (a: number) => a] })
			}).type.errors(
				"Type '(a: number) => number' is not assignable to type 'DefaultFor<number>'"
			)
		})

		it("default factory may return different values", () => {
			let i = 0
			const t = type({ bar: type("number[]").default(() => [++i]) })
			attest(t.assert({}).bar).snap([3])
			attest(t.assert({}).bar).snap([4])
		})

		it("default function factory", () => {
			let i = 0
			const t = type({
				bar: type("Function").default(() => {
					const j = ++i
					return () => j
				})
			})

			attest<{
				bar: Default<Function, () => number>
			}>(t.t)
			attest(t.assert({}).bar()).snap(3)
			attest(t.assert({}).bar()).snap(4)
		})

		it("allows union factory", () => {
			let i = 0
			const t = type({
				foo: [["number", "|", "number[]"], "=", () => (i % 2 ? ++i : [++i])]
			})
			attest(t.assert({})).snap({ foo: 2 })
			attest(t.assert({})).snap({ foo: [3] })
		})

		it("default array", () => {
			const t = type({
				foo: type("number[]").default(() => [1]),
				bar: type("number[]")
					.pipe(v => v.map(e => e.toString()))
					.default(() => [1])
			})
			const v1 = t.assert({})
			const v2 = t.assert({})
			attest(v1).snap({ foo: [1], bar: ["1"] })
			attest(v1.foo !== v2.foo)
		})

		it("default array is checked", () => {
			attest(() => {
				// @ts-expect-error
				type({ bar: type("number[]").default(() => ["a"]) })
			}).throws.snap(
				"ParseError: Default value at [0] must be a number (was a string)"
			)

			attest(() => {
				type({
					baz: type("number[]")
						.pipe(v => v.map(e => e.toString()))
						// @ts-expect-error
						.default(() => ["a"])
				})
			}).throws.snap(
				"ParseError: Default value at [0] must be a number (was a string)"
			)
		})

		it("default object", () => {
			const t = type({
				foo: type({ "foo?": "string" }).default(() => ({})),
				bar: type({ "foo?": "string" }).default(() => ({ foo: "foostr" })),
				baz: type({ foo: "string = 'foostr'" }).default(() => ({}))
			})

			const v1 = t.assert({}),
				v2 = t.assert({})

			attest(v1).snap({
				foo: {},
				bar: { foo: "foostr" },
				baz: { foo: "foostr" }
			})
			attest(v1.foo !== v2.foo)
		})

		it("default object is checked", () => {
			attest(() => {
				// @ts-expect-error
				type({ foo: type({ foo: "string" }).default({}) })
			}).throws(writeNonPrimitiveNonFunctionDefaultValueMessage(null))

			attest(() => {
				type({
					// @ts-expect-error
					bar: type({ foo: "number" }).default(() => ({ foo: "foostr" }))
				})
			}).throws.snap("ParseError: Default foo must be a number (was a string)")
		})
	})
})

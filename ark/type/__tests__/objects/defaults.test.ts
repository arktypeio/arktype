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
import { writeUnexpectedCharacterMessage } from "../../parser/shift/operator/operator.ts"

contextualize(() => {
	describe("parsing and traversal", () => {
		it("base", () => {
			const fnDefaultTo5 = () => 5 as const
			const O = type({
				a: "string",
				foo: "number = 5",
				bar: ["number", "=", 5],
				baz: ["number", "=", fnDefaultTo5]
			})

			attest(O.t).type.toString.snap(`{
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
			}>(O.inferIn)
			attest<{ a: string; foo: number; bar: number; baz: number }>(O.infer)

			attest(O.json).snap({
				required: [{ key: "a", value: "string" }],
				optional: [
					{ default: "$ark.fnDefaultTo5", key: "baz", value: "number" },
					{ default: 5, key: "bar", value: "number" },
					{ default: 5, key: "foo", value: "number" }
				],
				domain: "object"
			})

			attest(O({ a: "", foo: 4, bar: 4, baz: 4 })).equals({
				a: "",
				foo: 4,
				bar: 4,
				baz: 4
			})
			attest(O({ a: "" })).equals({ a: "", foo: 5, bar: 5, baz: 5 })
			attest(O({ bar: 4 }).toString()).snap("a must be a string (was missing)")
			attest(O({ a: "", bar: "" }).toString()).snap(
				"bar must be a number (was a string)"
			)
		})

		// https://github.com/arktypeio/arktype/issues/1335
		it("jitless", () => {
			const types = type.module(
				{
					foo: {
						test: "string = 'test'"
					}
				},
				{ jitless: true }
			)

			attest(types.foo({})).equals({ test: "test" })
			attest(types.foo({ test: "provided" })).equals({ test: "provided" })
		})

		it("unions are defaultable", () => {
			const O = type({
				boo: "boolean = false"
			})
			// this should not distribute to Default<true, true> | Default<false, true>
			attest(O).type.toString.snap("Type<{ boo: Default<boolean, false> }, {}>")
			attest(O.json).snap({
				optional: [
					{
						default: false,
						key: "boo",
						value: [{ unit: false }, { unit: true }]
					}
				],
				domain: "object"
			})

			attest(O({})).snap({ boo: false })
			attest(O({ boo: true })).snap({ boo: true })
			attest(O({ boo: 5 }).toString()).snap("boo must be boolean (was 5)")
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
			attest(() => type.module({ foo: "string = ''" })).throwsAndHasTypeError(
				shallowDefaultableMessage
			)

			attest(() =>
				// @ts-expect-error
				type.module({ foo: ["string", "=", ""] })
			).throwsAndHasTypeError(shallowDefaultableMessage)
		})

		it("chained", () => {
			const DefaultedString = type("string").default("")
			attest(DefaultedString).type.toString.snap('[Type<string, {}>, "=", ""]')

			const O = type({ a: DefaultedString })
			attest(O.t).type.toString.snap('{ a: Default<string, ""> }')
			attest<{ a?: string }>(O.inferIn)
			attest<{ a: string }>(O.infer)
			attest(O.json).snap({
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
					"Type 'string' is not assignable to type 'defaultFor<number>'."
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
				.type.errors.snap("Type 'false' is not assignable to type 'true'.")
		})

		it("unassignable default string", () => {
			// @ts-expect-error
			attest(() => type({ foo: "number = true" }))
				.throws.snap(
					"ParseError: Default for foo must be a number (was boolean)"
				)
				.type.errors("Default value true must be assignable to number ")
		})

		it("morphed", () => {
			// https://discord.com/channels/957797212103016458/1280932672029593811/1283368602355109920
			const ProcessForm = type({
				bool_value: type("string")
					.pipe(v => (v === "on" ? true : false))
					.default("off")
			})

			attest<{
				bool_value: (In: Default<string, "off">) => Out<boolean>
			}>(ProcessForm.t)

			attest<{
				// key should still be distilled as optional even inside a morph
				bool_value?: string
			}>(ProcessForm.inferIn)
			attest<{
				bool_value: boolean
			}>(ProcessForm.infer)

			const out = ProcessForm({})

			attest(out).snap({ bool_value: false })

			attest(ProcessForm({ bool_value: "on" })).snap({ bool_value: true })

			attest(ProcessForm({ bool_value: true }).toString()).snap(
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

			const T = type({
				blep: type("boolean").pipe(toggle).default(false)
			})

			attest(T.t).type.toString.snap(`{
	blep: (In: Default<boolean, false>) => Out<boolean>
}`)

			attest(T.json).snap({
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

			const out = T({})

			attest(out).snap({ blep: true })
			attest(callCount).equals(1)

			T({})
			attest(callCount).equals(1)
		})

		it("default preserved on pipe to node", () => {
			let callCount = 0

			const toggle = (b: boolean) => {
				callCount++
				return !b
			}

			const toggleRef = registeredReference(toggle)

			const T = type({
				blep: type("boolean").pipe(toggle).to("boolean").default(false)
			})

			attest(T.t).type.toString.snap(`{
	blep: (In: Default<boolean, false>) => To<boolean>
}`)

			attest(T.json).snap({
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

			const out = T({})

			attest(out).snap({ blep: true })
			attest(callCount).equals(1)

			T({})
			attest(callCount).equals(1)
		})

		it("primitive morphed to object not premorphed", () => {
			const T = type({
				foo: type("string")
					.pipe(s => ({ nest: s }))
					.default("foo")
			})
			attest<{
				foo: (In: Default<string, "foo">) => Out<{
					nest: string
				}>
			}>(T.t)

			const out = T.assert({})

			attest(out).snap({ foo: { nest: "foo" } })

			const originalOut = deepClone(out)

			out.foo.nest = "baz"

			attest(T({})).equals(originalOut)
		})
	})

	describe("string parsing", () => {
		it("number", () => {
			const T = type({ key: "number = 42" })
			const Expected = type({ key: ["number", "=", 42] })

			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("bigint", () => {
			const T = type({ key: "bigint = 100n" })
			const Expected = type({ key: ["bigint", "=", 100n] })

			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("string", () => {
			const T = type({ key: 'string = "default value"' })
			const Expected = type({ key: ["string", "=", "default value"] })

			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("Date", () => {
			const T = type({ key: 'Date = d"1993-05-21"' })

			const out = T.assert({})

			attest(out.key.toISOString()).snap("1993-05-21T00:00:00.000Z")

			// we can't check expected here since the Date instance will not
			// have a narrowed literal type
			attest<{
				key: Default<Date, Date>
			}>(T.t)
		})

		it("Date is immutable", () => {
			const T = type({ date: 'Date = d"1993-05-21"' })
			const v1 = T.assert({})
			const time = v1.date.getTime()
			v1.date.setMilliseconds(123)
			const v2 = T.assert({})
			attest(v2.date.getTime()).equals(time)
		})

		it("true", () => {
			const T = type({ key: "boolean = true" })
			const Expected = type({ key: ["boolean", "=", true] })

			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("false", () => {
			const T = type({ key: "boolean = false" })
			const Expected = type({ key: ["boolean", "=", false] })

			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("null", () => {
			// ideally we could infer a better type here,
			// but attaching attributes to null or undefined
			// is not possible with the current design
			const T = type({ key: "object | null = null" })
			const Expected = type({ key: ["object | null", "=", null] })

			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("undefined", () => {
			const T = type({ key: "unknown = undefined" })
			const Expected = type({ key: ["unknown", "=", undefined] })

			attest(T({})).snap({ key: undefined })

			attest<typeof Expected>(T)
			attest(T.json).equals(Expected.json)
		})

		it("incorrect default type", () => {
			// @ts-expect-error
			attest(() => type({ foo: "string", bar: "number = true" }))
				.throws.snap(
					"ParseError: Default for bar must be a number (was boolean)"
				)
				.type.errors("Default value true must be assignable to number")
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

		it("defaultable input extracted as optional", () => {
			const T = type({ foo: "number = 0" })
			attest<{ foo?: number }>(T.in.t)
			attest<{ foo?: number }>(T.inferIn)

			attest(T.in.expression).snap("{ foo?: number }")
		})

		it("defaultable output extracted as required", () => {
			const T = type({ foo: "number = 0" })
			attest<{ foo: number }>(T.out.t)
			attest<{ foo: number }>(T.inferOut)

			attest(T.out.expression).snap("{ foo: number }")
		})

		// https://github.com/arktypeio/arktype/issues/1507
		it("fails on expression value", () => {
			attest(() =>
				type({
					// @ts-expect-error
					test: "'y' | 'n' = 'n' |> 'y'"
				})
			)
				.throws(writeUnexpectedCharacterMessage("|"))
				.type.errors(writeNonLiteralDefaultMessage("'n' |> 'y'"))
		})
	})

	describe("works properly with types", () => {
		it("allows primitives and factories for anys", () => {
			const fn = () => {}
			const T = type({
				foo1: ["unknown", "=", true],
				bar1: ["unknown", "=", () => [true]],
				baz1: ["unknown", "=", () => fn],
				foo2: ["unknown.any", "=", true],
				bar2: ["unknown.any", "=", () => [true]],
				baz2: ["unknown.any", "=", () => fn]
			})
			const out = T.assert({})
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

		it("allows string subtyping", () => {
			type({
				foo: [/^foo/ as type.cast<`foo${string}`>, "=", "foobar"],
				bar: [/bar$/ as type.cast<`${string}bar`>, "=", () => "foobar" as const]
			})
		})

		describe("bad values", () => {
			it("primitive", () => {
				attest(
					// @ts-expect-error
					() => type({ foo: ["number", "=", true] })
				)
					.throws.snap(
						"ParseError: Default for foo must be a number (was boolean)"
					)
					.type.errors.snap(
						"Type 'boolean' is not assignable to type 'defaultFor<number>'."
					)
			})

			it("array", () => {
				attest(
					// @ts-expect-error
					() => type({ foo: ["number[]", "=", true] })
				)
					.throws.snap(
						"ParseError: Default for foo must be an array (was boolean)"
					)
					.type.errors.snap(
						"Type 'boolean' is not assignable to type '() => number[]'."
					)
			})

			it("object", () => {
				attest(
					// @ts-expect-error
					() => type({ foo: [{ bar: "false" }, "=", true] })
				)
					.throws.snap(
						"ParseError: Default for foo must be an object (was boolean)"
					)
					.type.errors.snap(
						"Type 'boolean' is not assignable to type '() => { bar: false; }'."
					)
			})

			it("union", () => {
				attest(
					// @ts-expect-error
					() => type({ foo: [["number[]", "|", "string"], "=", true] })
				)
					.throws.snap(
						"ParseError: Default for foo must be a string or an object (was boolean)"
					)
					.type.errors.snap(
						"Type 'boolean' is not assignable to type 'defaultFor<string | number[]>'."
					)
			})

			it("union with default", () => {
				// should not cause "instantiation is excessively deep"
				attest(
					// @ts-expect-error
					() => type("number[]", "|", "string").default(true)
				)
					.throws.snap(
						"ParseError: Default must be a string or an object (was boolean)"
					)
					.type.errors.snap(
						"Argument of type 'boolean' is not assignable to parameter of type 'defaultFor<string | number[]>'."
					)
			})

			it("union with default function", () => {
				// should not cause "instantiation is excessively deep"
				attest(
					// @ts-expect-error
					() => type("number[]", "|", "string").default(() => true)
				)
					.throws.snap(
						"ParseError: Default must be a string or an object (was boolean)"
					)
					.type.errors(
						"Type 'boolean' is not assignable to type 'string | number[]'."
					)
			})
		})

		describe("morph input errors", () => {
			it("string", () => {
				// @ts-expect-error
				attest(() => type({ foo: ["string.numeric.parse = true"] }))
					.throws("must be a string (was boolean)")
					.type.errors(
						"Default value true must be assignable to string.numeric.parse"
					)
			})

			it("tuple", () => {
				// @ts-expect-error
				attest(() => type({ foo: ["string.numeric.parse", "=", true] }))
					.throws("must be a string (was boolean)")
					.type.errors(
						"Type 'boolean' is not assignable to type 'defaultFor<string>'."
					)
			})

			it("function", () => {
				// @ts-expect-error
				attest(() => type({ foo: ["string.numeric.parse", "=", () => true] }))
					.throws("must be a string (was boolean)")
					.type.errors("Type 'boolean' is not assignable to type 'string'.")
			})

			it("reference tuple", () => {
				const Numtos = type("number").pipe(s => `${s}`)
				// @ts-expect-error
				attest(() => type({ foo: [Numtos, "=", true] }))
					.throws("must be a number (was boolean)")
					.type.errors(
						"Type 'boolean' is not assignable to type 'defaultFor<number>'."
					)
			})

			it("reference function", () => {
				const Numtos = type("number").pipe(s => `${s}`)
				// @ts-expect-error
				attest(() => type({ foo: [Numtos, "=", () => true] }))
					.throws("must be a number (was boolean)")
					.type.errors("Type 'boolean' is not assignable to type 'number'.")
			})
		})

		it("morphed inputs", () => {
			const Numtos = type("number").pipe(s => `${s}`)
			const F = type({
				foo1: "string.numeric.parse = '123'",
				foo2: ["string.numeric.parse", "=", "123"],
				foo3: ["string.numeric.parse", "=", () => "123"],
				bar1: [Numtos, "=", 123],
				bar2: [Numtos, "=", () => 123],
				baz1: type(Numtos).default(123)
			})
			attest(F.assert({})).snap({
				foo1: 123,
				foo2: 123,
				foo3: 123,
				bar1: "123",
				bar2: "123",
				baz1: "123"
			})
		})

		it("pipes from undefined or not present", () => {
			const defaultDate = new Date("2020-01-01")

			const ParsedDate = type("string | undefined").pipe(
				(input: string | undefined) => (input ? new Date(input) : defaultDate)
			)

			const SearchSchema = type({
				week: ParsedDate.default(defaultDate.toISOString())
			})

			attest(SearchSchema({ week: "2023-01-01" })).snap({
				week: "2023-01-01T00:00:00.000Z"
			})

			attest(SearchSchema({ week: undefined })).snap({
				week: "2020-01-01T00:00:00.000Z"
			})

			attest(SearchSchema({})).snap({ week: "2020-01-01T00:00:00.000Z" })
		})
	})

	describe("intersection", () => {
		it("two optionals, one default", () => {
			const L = type({ bar: ["number", "=", 5] })
			const R = type({ "bar?": "5" })

			const T = L.and(R)
			attest(T.json).snap({
				optional: [{ default: 5, key: "bar", value: { unit: 5 } }],
				domain: "object"
			})
		})

		it("same default", () => {
			const L = type({ bar: ["number", "=", 5] })
			const R = type({ bar: ["5", "=", 5] })

			const T = L.and(R)
			attest(T.json).snap({
				optional: [{ default: 5, key: "bar", value: { unit: 5 } }],
				domain: "object"
			})
		})

		it("removed when intersected with required", () => {
			const L = type({ bar: ["number", "=", 5] })
			const R = type({ bar: "number" })

			const T = L.and(R)
			attest(T.json).snap({
				required: [{ key: "bar", value: "number" }],
				domain: "object"
			})
		})

		it("errors on multiple defaults", () => {
			const L = type({ bar: ["number", "=", 5] })
			const R = type({ bar: ["number", "=", 6] })
			attest(() => L.and(R)).throws.snap(
				"ParseError: Invalid intersection of default values 5 & 6"
			)
		})
	})

	describe("functions", () => {
		it("works in tuple", () => {
			const T = type({ foo: ["string", "=", () => "bar" as const] })

			attest(T.t).type.toString.snap('{ foo: Default<string, "bar"> }')
			attest(T.assert({ foo: "bar" })).snap({ foo: "bar" })
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
			const T = type({ foo: ["string.numeric.parse", "=", () => "123"] })

			attest<{
				foo: (In: Default<string, string>) => To<number>
			}>(T.t)
			attest(T.assert({})).snap({ foo: 123 })
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
				"Type '(a: number) => number' is not assignable to type 'defaultFor<number>'"
			)
		})

		it("default factory may return different values", () => {
			let i = 0
			const T = type({ bar: type("number[]").default(() => [++i]) })
			attest(T.assert({}).bar).snap([3])
			attest(T.assert({}).bar).snap([4])
		})

		it("default function factory", () => {
			let i = 0
			const T = type({
				bar: type("Function").default(() => {
					const j = ++i
					return () => j
				})
			})

			attest<{
				bar: Default<Function, () => number>
			}>(T.t)
			attest(T.assert({}).bar()).snap(3)
			attest(T.assert({}).bar()).snap(4)
		})

		it("allows union factory", () => {
			let i = 0
			const T = type({
				foo: [["number", "|", "number[]"], "=", () => (i % 2 ? ++i : [++i])]
			})
			attest(T.assert({})).snap({ foo: 2 })
			attest(T.assert({})).snap({ foo: [3] })
		})

		it("default array", () => {
			const T = type({
				foo: type("number[]").default(() => [1]),
				bar: type("number[]")
					.pipe(v => v.map(e => e.toString()))
					.default(() => [1])
			})
			const v1 = T.assert({})
			const v2 = T.assert({})
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
			const T = type({
				foo: type({ "foo?": "string" }).default(() => ({})),
				bar: type({ "foo?": "string" }).default(() => ({ foo: "foostr" })),
				baz: type({ foo: "string = 'foostr'" }).default(() => ({}))
			})

			const v1 = T.assert({}),
				v2 = T.assert({})

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

	it("extracted from cyclic type", () => {
		const T = type({
			defaulted: "number = 0",
			"nested?": "this"
		})

		const t = T.assert({})

		attest(t).equals({ defaulted: 0 })

		attest<number>(t.defaulted)
		attest<number | undefined>(t.nested?.defaulted)
	})
})

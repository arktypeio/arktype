import { attest, contextualize } from "@ark/attest"
import {
	registeredReference,
	writeInvalidPropertyKeyMessage,
	writeUnboundableMessage,
	writeUnresolvableMessage
} from "@ark/schema"
import { printable } from "@ark/util"
import { scope, type } from "arktype"
import {
	writeInvalidSpreadTypeMessage,
	writeInvalidUndeclaredBehaviorMessage
} from "arktype/internal/parser/objectLiteral.ts"
import { writeUnexpectedCharacterMessage } from "arktype/internal/parser/string/shift/operator/operator.ts"

contextualize(() => {
	describe("named", () => {
		it("empty", () => {
			const o = type({})
			attest(o.json).equals(type("object").json)
		})

		it("required", () => {
			const o = type({ a: "string", b: "number" })
			attest<{ a: string; b: number }>(o.infer)
			attest(o.json).snap({
				domain: "object",
				required: [
					{ key: "a", value: "string" },
					{ key: "b", value: "number" }
				]
			})
		})

		it("optional keys", () => {
			const o = type({ "a?": "string", b: "number" })
			attest<{ a?: string; b: number }>(o.infer)
			attest(o.json).snap({
				domain: "object",
				required: [{ key: "b", value: "number" }],
				optional: [{ key: "a", value: "string" }]
			})
		})

		it("symbol key", () => {
			const s = Symbol()
			const name = registeredReference(s)
			const t = type({
				[s]: "string"
			})
			attest<{ [s]: string }>(t.infer)
			attest(t.json).snap({
				domain: "object",
				required: [{ key: name, value: "string" }]
			})
		})

		it("serializes to same value but not reference equal", () => {
			const t = type("===", {})
			attest(t({}).toString()).snap(
				"must be reference equal to {} (serialized to the same value)"
			)
		})

		it("error in obj that has tuple that writes error at proper path", () => {
			// @ts-expect-error
			attest(() => type({ "a?": ["string", ["stringx", "?"]] }))
				.throws(writeUnresolvableMessage("stringx"))
				.type.errors.snap(
					"Type '\"stringx\"' is not assignable to type '\"'stringx' is unresolvable \"'."
				)
		})

		it("nested", () => {
			const t = type({ "a?": { b: "boolean" } })
			attest<{ a?: { b: boolean } }>(t.infer)
		})

		it("intersections", () => {
			const a = { "a?": "string" } as const
			const b = { b: "string" } as const
			const c = { "c?": "string" } as const
			const abc = type(a).and(b).and(c)
			attest<{ a?: string; b: string; c?: string }>(abc.infer)
			attest(abc.json).equals(type({ ...a, ...b, ...c }).json)
			attest(abc.json).equals(type([[a, "&", b], "&", c]).json)
		})

		it("intersection", () => {
			const t = type({ a: "number" }).and({ b: "boolean" })
			// Should be simplified from {a: number} & {b: boolean} to {a: number, b: boolean}
			attest(t.infer).type.toString.snap("{ a: number; b: boolean }")
			attest(t.json).equals(type({ a: "number", b: "boolean" }).json)
		})

		it("escaped optional token", () => {
			const t = type({ "a\\?": "string" })
			attest<{ "a?": string }>(t.infer)
			attest(t.json).snap({
				required: [{ key: "a?", value: "string" }],
				domain: "object"
			})
		})

		it("traverse optional", () => {
			const o = type({ "a?": "string" })
			attest(o({ a: "a" })).snap({ a: "a" })
			attest(o({})).snap({})
			attest(o({ a: 1 }).toString()).snap("a must be a string (was number)")
		})

		// it("optional symbol", () => {
		// 	const s = Symbol()
		// 	const name = reference(s)
		// 	const t = type({
		// 		[optional(s)]: "number"
		// 	})
		// 	attest<{ [s]?: number }>(t.infer)
		// 	attest(t.json).equals({
		// 		domain: "object",
		// 		optional: [{ key: name, value: "number" }]
		// 	})
		// })
	})

	describe("spread syntax", () => {
		it("within scope", () => {
			const s = scope({
				user: { isAdmin: "false", name: "string" },
				admin: { "...": "user", isAdmin: "true" }
			}).export()

			attest<{ isAdmin: true; name: string }>(s.admin.infer)
			attest(s.admin.json).equals({
				domain: "object",
				required: [
					{ key: "isAdmin", value: { unit: true } },
					{ key: "name", value: "string" }
				]
			})
		})

		it("from another `type` call", () => {
			const user = type({ isAdmin: "false", name: "string" })
			const admin = type({ "...": user, isAdmin: "true" })

			attest<{ isAdmin: true; name: string }>(admin.infer)
			attest(admin.json).snap({
				domain: "object",
				required: [
					{ key: "isAdmin", value: { unit: true } },
					{ key: "name", value: "string" }
				]
			})
		})

		it("from an object literal", () => {
			// no idea why you'd want to do this
			const t = type({
				"...": {
					inherited: "boolean",
					overridden: "string"
				},
				overridden: "number"
			})

			attest<{
				inherited: boolean
				overridden: number
			}>(t.infer)

			attest(t.json).snap({
				domain: "object",
				required: [
					{
						key: "inherited",
						value: [{ unit: false }, { unit: true }]
					},
					{ key: "overridden", value: "number" }
				]
			})
		})

		it("escaped key", () => {
			const t = type({
				"\\...": "string"
			})

			attest<{ "...": string }>(t.infer)

			attest(t.json).snap({
				domain: "object",
				required: [{ key: "...", value: "string" }]
			})
		})

		it("with non-object", () => {
			// @ts-expect-error
			attest(() => type({ "...": "string" })).throwsAndHasTypeError(
				writeInvalidSpreadTypeMessage("string")
			)
		})

		// this is a regression test to ensure nodes are handled even if they aren't just an object
		it("with complex type", () => {
			const adminUser = type({
				"...": [{ name: "string" }, "&", { isAdmin: "false" }],
				isAdmin: "true"
			})

			attest<{ isAdmin: true; name: string }>(adminUser.infer)
			attest(adminUser.json).snap({
				domain: "object",
				required: [
					{ key: "isAdmin", value: { unit: true } },
					{ key: "name", value: "string" }
				]
			})
		})
	})

	describe("index", () => {
		it("string index", () => {
			const o = type({ "[string]": "string" })
			attest<{ [x: string]: string }>(o.infer)
			attest(o.json).snap({
				domain: "object",
				index: [{ signature: "string", value: "string" }]
			})

			attest(o({})).equals({})
			attest(o({ a: "a", b: "b" })).equals({ a: "a", b: "b" })

			const validWithSymbol = { a: "a", [Symbol()]: null }
			attest(validWithSymbol).equals(validWithSymbol)

			attest(o({ a: 1 }).toString()).snap("a must be a string (was number)")
			attest(o({ a: true, b: false }).toString())
				.snap(`a must be a string (was true)
b must be a string (was false)`)
		})

		it("symbol index", () => {
			const o = type({ "[symbol]": "1" })
			attest<{ [x: symbol]: 1 }>(o.infer)
			attest(o.json).snap({
				domain: "object",
				index: [{ signature: "symbol", value: { unit: 1 } }]
			})

			attest(o({})).equals({})

			attest(o({ a: 999 })).unknown.snap({ a: 999 })

			const zildjian = Symbol()
			const zildjianName = printable(zildjian)

			// I've been dope, suspenseful with a pencil
			// Ever since...
			const prince = Symbol()
			const princeName = printable(prince)

			attest(o({ [zildjian]: 1, [prince]: 1 })).equals({
				[zildjian]: 1,
				[prince]: 1
			})

			attest({ a: 0, [zildjian]: 1 }).equals({ a: 0, [zildjian]: 1 })

			attest(o({ [zildjian]: 0 }).toString()).equals(
				`value at [${zildjianName}] must be 1 (was 0)`
			)
			attest(o({ [prince]: null, [zildjian]: undefined }).toString())
				.snap(`value at [${princeName}] must be 1 (was null)
value at [${zildjianName}] must be 1 (was undefined)`)
		})

		it("enumerable indexed union", () => {
			const o = type({ "['foo' | 'bar']": "string" })
			const expected = type({ foo: "string", bar: "string" })
			attest<typeof expected>(o)
			attest(o.json).equals(expected.json)
		})

		it("non-enumerable indexed union", () => {
			const o = type({ "[string | symbol]": "string" })
			attest<{ [x: string]: string; [x: symbol]: string }>(o.infer)
			attest(o.json).snap({
				domain: "object",
				index: [{ signature: ["string", "symbol"], value: "string" }]
			})
		})

		it("multiple indexed", () => {
			const o = type({
				"[string]": "string",
				"[symbol]": "number"
			})
			attest<{ [x: string]: string; [x: symbol]: number }>(o.infer)
			attest(o.json).snap({
				index: [
					{ value: "string", signature: "string" },
					{ value: "number", signature: "symbol" }
				],
				domain: "object"
			})

			attest(o({})).equals({})
			attest(o({ foo: "f" })).equals({ foo: "f" })

			const sym = Symbol()

			const symName = printable(sym)

			const validWithStringsAndSymbols = {
				str: "string",
				[sym]: 8675309
			}

			attest(o(validWithStringsAndSymbols)).equals(validWithStringsAndSymbols)

			attest(
				o({
					str: 100,
					[sym]: "💯"
				}).toString()
			).snap(`str must be a string (was number)
value at [${symName}] must be a number (was string)`)
		})

		it("all key kinds", () => {
			const o = type({
				"[string]": "string",
				required: "'foo'",
				"optional?": "'bar'"
			})
			attest<{ [x: string]: string; required: "foo"; optional?: "bar" }>(
				o.infer
			)
			attest(o.json).snap({
				domain: "object",
				required: [{ key: "required", value: { unit: "foo" } }],
				optional: [{ key: "optional", value: { unit: "bar" } }],
				index: [{ signature: "string", value: "string" }]
			})

			const valid: typeof o.infer = { required: "foo", other: "bar" }
			attest(o(valid)).equals(valid)
			attest(
				o({
					optional: "wrongString",
					other: 0n
				}).toString()
			).snap(`required must be "foo" (was missing)
optional must be "bar" (was "wrongString")
other must be a string (was bigint)`)
		})

		it("index key from scope", () => {
			const types = scope({
				key: "symbol|'foo'|'bar'|'baz'",
				obj: {
					"[key]": "string"
				}
			}).export()
			type Key = symbol | "foo" | "bar" | "baz"
			attest<Key>(types.key.infer)
			attest<Record<Key, string>>(types.obj.infer)

			const expected = type({ "[symbol]": "string" }).and({
				foo: "string",
				bar: "string",
				baz: "string"
			})

			attest(types.obj.json).snap(expected.json)
		})

		it("intersection with named", () => {
			const t = type({ "[string]": "4" }).and({ "a?": "1" })
			attest<{
				[k: string]: 4
				a?: never
			}>(t.infer)
			attest(t.json).snap({
				optional: [{ key: "a", value: { unit: 1 } }],
				index: [{ value: { unit: 4 }, signature: "string" }],
				domain: "object"
			})
		})

		it("intersction with right required", () => {
			const t = type({ "a?": "true" }).and({ a: "boolean" })
			attest<{ a: true }>(t.infer)
			const expected = type({
				a: "true"
			})
			attest(t.json).equals(expected.json)
		})

		it("syntax error in index definition", () => {
			attest(() =>
				type({
					// @ts-expect-error
					"[unresolvable]": "string"
				})
			).throwsAndHasTypeError(writeUnresolvableMessage("unresolvable"))
		})

		it("does not allow syntax error message as value", () => {
			attest(() =>
				type({
					// @ts-expect-error
					"[unresolvable]": "'unresolvable' is unresolvable"
				})
			)
				.throws(writeUnexpectedCharacterMessage("i"))
				.type.errors(writeUnresolvableMessage("unresolvable"))
		})

		it("semantic error in index definition", () => {
			attest(() =>
				type({
					// @ts-expect-error
					"[symbol<5]": "string"
				})
			).throwsAndHasTypeError(writeUnboundableMessage("symbol"))
		})

		it("invalid key type for index definition", () => {
			attest(() =>
				type({
					// @ts-expect-error
					"[object]": "string"
				})
			).throwsAndHasTypeError(writeInvalidPropertyKeyMessage("object"))
		})

		it("does not allow invalid key type error as value", () => {
			attest(() =>
				type({
					// @ts-expect-error
					"[object]":
						"Indexed key definition 'object' must be a string, number or symbol"
				})
			)
				.throws(writeUnresolvableMessage("Indexed"))
				.type.errors(writeInvalidPropertyKeyMessage("object"))
		})

		it("escaped index", () => {
			const o = type({ "\\[string]": "string" })
			attest<{ "[string]": string }>(o.infer)
			attest(o.json).snap({
				domain: "object",
				required: [{ key: "[string]", value: "string" }]
			})
		})

		// https://github.com/arktypeio/arktype/issues/1040
		it("can constrain optional keys", () => {
			const repro = type({
				normal: "string>0",
				"optional?": "string>0"
			})

			type Expected = { normal: string; optional?: string }

			attest<Expected, typeof repro.infer>()
			attest<Expected, typeof repro.inferIn>()

			attest(repro.expression).snap(
				"{ normal: string >= 1, optional?: string >= 1 }"
			)
		})
	})

	describe("undeclared", () => {
		it("can parse an undeclared restriction", () => {
			const t = type({ "+": "reject" })
			attest<{}>(t.infer)
			attest(t.json).snap({ undeclared: "reject", domain: "object" })
		})
		it("fails on type definition for undeclared", () => {
			// @ts-expect-error
			attest(() => type({ "+": "string" }))
				.throws(writeInvalidUndeclaredBehaviorMessage("string"))
				.type.errors.snap(
					"Type '\"string\"' is not assignable to type 'UndeclaredKeyBehavior'."
				)
		})
		it("can escape undeclared meta key", () => {
			const t = type({ "\\+": "string" })
			attest<{ "+": string }>(t.infer)
			attest(t.json).snap({
				required: [{ key: "+", value: "string" }],
				domain: "object"
			})
		})
	})
})

import { attest } from "@arktype/attest"
import {
	writeInvalidPropertyKeyMessage,
	writeUnboundableMessage,
	writeUnresolvableMessage
} from "@arktype/schema"
import { printable, reference } from "@arktype/util"
import { scope, type } from "arktype"
import { describe, it } from "vitest"
import { writeInvalidSpreadTypeMessage } from "../parser/objectLiteral.js"

describe("object literal", () => {
	it("empty", () => {
		const o = type({})
		attest(o.json).equals(type("object").json)
	})
	it("required", () => {
		const o = type({ a: "string", b: "number" })
		attest<{ a: string; b: number }>(o.infer)
		attest(o.json).snap({
			domain: "object",
			prop: [
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
			prop: [
				{ key: "a", optional: true, value: "string" },
				{ key: "b", value: "number" }
			]
		})
	})
	it("symbol key", () => {
		const s = Symbol()
		const name = reference(s)
		const t = type({
			[s]: "string"
		})
		attest<{ [s]: string }>(t.infer)
		attest(t.json).snap({
			domain: "object",
			prop: [{ key: name, value: "string" }]
		})
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
	describe("spread syntax", () => {
		it("within scope", () => {
			const s = scope({
				user: { isAdmin: "false", name: "string" },
				admin: { "...": "user", isAdmin: "true" }
			}).export()

			attest<{ isAdmin: true; name: string }>(s.admin.infer)
			attest(s.admin.json).equals({
				domain: "object",
				prop: [
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
				prop: [
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
				prop: [
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
				prop: [{ key: "...", value: "string" }]
			})
		})

		it("with non-object", () => {
			// @ts-expect-error
			attest(() => type({ "...": "string" })).throwsAndHasTypeError(
				writeInvalidSpreadTypeMessage(printable("string"))
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
				prop: [
					{ key: "isAdmin", value: { unit: true } },
					{ key: "name", value: "string" }
				]
			})
		})
	})
	it("error in obj that has tuple that writes error at proper path", () => {
		// @ts-expect-error
		attest(() => type({ "a?": ["string", ["stringx", "?"]] }))
			.throws(writeUnresolvableMessage("stringx"))
			.type.errors.snap(
				"Type '\"stringx\"' is not assignable to type '\"'stringx' is unresolvable \"'."
			)
	})
	it("index", () => {
		const o = type({ "[string]": "string" })
		attest<{ [x: string]: string }>(o.infer)
	})
	it("enumerable indexed union", () => {
		const o = type({ "['foo' | 'bar']": "string" })
		attest<{ foo: string; bar: string }>(o.infer)
	})
	it("non-enumerable indexed union", () => {
		const o = type({ "[string | symbol]": "string" })
		attest<{ [x: string]: string; [x: symbol]: string }>(o.infer)
	})
	it("multiple indexed", () => {
		const o = type({
			"[string]": "string",
			"[symbol]": "number"
		})
		attest<{ [x: string]: string; [x: symbol]: number }>(o.infer)
	})
	it("all key kinds", () => {
		const o = type({
			"[string]": "string",
			required: "'foo'",
			"optional?": "'bar'"
		})
		attest<{ [x: string]: string; required: "foo"; optional?: "bar" }>(o.infer)
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
		).throwsAndHasTypeError(writeUnresolvableMessage("unresolvable"))
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
	// TODO: reenable
	// it("traverse optional", () => {
	// 	const o = type({ "a?": "string" }).configure({ keys: "strict" })
	// 	attest(o({ a: "a" }).out).snap({ a: "a" })
	// 	attest(o({}).out).snap({})
	// 	attest(o({ a: 1 }).errors?.summary).snap("a must be a string (was number)")
	// })
	it("intersection", () => {
		const t = type({ a: "number" }).and({ b: "boolean" })
		// Should be simplified from {a: number} & {b: boolean} to {a: number, b: boolean}
		attest(t.infer).type.toString.snap("{ a: number; b: boolean; }")
		attest(t.json).equals(type({ a: "number", b: "boolean" }).json)
	})
	it("escaped optional token", () => {
		const t = type({ "a\\?": "string" })
		attest<{ "a?": string }>(t.infer)
	})
	it("escaped index", () => {
		const o = type({ "\\[string]": "string" })
		attest<{ "[string]": string }>(o.infer)
	})
	// TODO: reenable
	// it("multiple bad strict", () => {
	// 	const t = type({ a: "string", b: "boolean" }).configure({
	// 		keys: "strict"
	// 	})
	// 	attest(t({ a: 1, b: 2 }).errors?.summary).snap(
	// 		"a must be a string (was number)\nb must be boolean (was number)"
	// 	)
	// })
})

import { attest } from "@arktype/attest"
import { writeUnboundableMessage } from "@arktype/schema"
import { scope, type } from "arktype"
import { writeInvalidPropertyKeyMessage } from "../parser/objectLiteral.ts"
import { writeUnresolvableMessage } from "../parser/string/shift/operand/unenclosed.ts"

describe("object literal", () => {
	it("empty", () => {
		const o = type({})
		attest(o.json).equals(type("object").json)
	})
	it("required", () => {
		const o = type({ a: "string", b: "boolean" })
		attest<{ a: string; b: boolean }>(o.infer)
		attest(o.json).snap({ domain: "object" })
	})
	it("optional keys", () => {
		const o = type({ "a?": "string", b: "boolean" })
		attest<{ a?: string; b: boolean }>(o.infer)
	})
	it("symbol key", () => {
		const s = Symbol()
		const t = type({
			[s]: "boolean"
		})
		attest<{ [s]: boolean }>(t.infer)
	})
	it("optional symbol", () => {
		const s = Symbol()
		const t = type({
			[s]: "boolean?"
		})
		attest<{ [s]?: boolean }>(t.infer)
	})
	describe("optional keys and definition reduction", () => {
		it("optional value", () => {
			const t = type({ a: "string?" })
			attest(t.json).equals(type({ "a?": "string" }).json)
		})
		it("optional key and value", () => {
			const t = type({ "a?": "string?" })
			attest(t.json).equals(type({ "a?": "string" }).json)
		})
		it("optional value as tuple", () => {
			const t = type({ a: ["string", "?"] })
			attest(t.json).equals(type({ "a?": "string" }).json)
		})
	})
	it("error in obj that has tuple that writes error at proper path", () => {
		// @ts-expect-error
		attest(() => type({ "a?": ["string", "string?", ["stringx", "?"]] }))
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
		).throwsAndHasTypeError(writeInvalidPropertyKeyMessage("object"))
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
	it("traverse optional", () => {
		const o = type({ "a?": "string" }).configure({ keys: "strict" })
		attest(o({ a: "a" }).data).snap({ a: "a" })
		attest(o({}).data).snap({})
		attest(o({ a: 1 }).problems?.summary).snap(
			"a must be a string (was number)"
		)
	})
	it("intersection", () => {
		const t = type({ a: "number" }).and({ b: "boolean" })
		// Should be simplified from {a: number} & {b: boolean} to {a: number, b: boolean}
		attest(t.infer).type.toString.snap("{ a: number; b: boolean; }")
		attest(t.json).is(type({ a: "number", b: "boolean" }).json)
	})
	it("escaped optional token", () => {
		const t = type({ "a\\?": "string" })
		attest<{ "a?": string }>(t.infer)
	})
	it("escaped index", () => {
		const o = type({ "\\[string]": "string" })
		attest<{ "[string]": string }>(o.infer)
	})
	it("multiple bad strict", () => {
		const t = type({ a: "string", b: "boolean" }).configure({
			keys: "strict"
		})
		attest(t({ a: 1, b: 2 }).problems?.summary).snap(
			"a must be a string (was number)\nb must be boolean (was number)"
		)
	})
})

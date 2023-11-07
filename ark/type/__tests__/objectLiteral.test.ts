import { attest } from "@arktype/attest"
import { writeUnboundableMessage } from "@arktype/schema"
import { scope, type } from "arktype"
import { suite, test } from "mocha"
import { writeInvalidPropertyKeyMessage } from "../parser/objectLiteral.js"
import { writeUnresolvableMessage } from "../parser/string/shift/operand/unenclosed.js"

suite("object literal", () => {
	test("empty", () => {
		const o = type({})
		attest(o.condition).equals(type("object").condition)
	})
	test("required", () => {
		const o = type({ a: "string", b: "boolean" })
		attest<{ a: string; b: boolean }>(o.infer)
		attest(o.condition)
			.snap(`if (!(((typeof $arkRoot === "object" && $arkRoot !== null) || typeof $arkRoot === "function"))) {
        return false
}
$ark.object26($arkRoot.a)
$ark.object36($arkRoot.b)`)
	})
	test("optional keys", () => {
		const o = type({ "a?": "string", b: "boolean" })
		attest<{ a?: string; b: boolean }>(o.infer)
	})
	test("symbol key", () => {
		const s = Symbol()
		const t = type({
			[s]: "boolean"
		})
		attest<{ [s]: boolean }>(t.infer)
	})
	test("optional symbol", () => {
		const s = Symbol()
		const t = type({
			[s]: "boolean?"
		})
		attest<{ [s]?: boolean }>(t.infer)
	})
	suite("optional keys and definition reduction", () => {
		test("optional value", () => {
			const t = type({ a: "string?" })
			attest(t.condition).equals(type({ "a?": "string" }).condition)
		})
		test("optional key and value", () => {
			const t = type({ "a?": "string?" })
			attest(t.condition).equals(type({ "a?": "string" }).condition)
		})
		test("optional value as tuple", () => {
			const t = type({ a: ["string", "?"] })
			attest(t.condition).equals(type({ "a?": "string" }).condition)
		})
	})
	test("error in obj that has tuple that writes error at proper path", () => {
		// @ts-expect-error
		attest(() => type({ "a?": ["string", "string?", ["stringx", "?"]] }))
			.throws(writeUnresolvableMessage("stringx"))
			.type.errors.snap(
				"Type '\"stringx\"' is not assignable to type '\"'stringx' is unresolvable \"'."
			)
	})
	test("index", () => {
		const o = type({ "[string]": "string" })
		attest<{ [x: string]: string }>(o.infer)
	})
	test("enumerable indexed union", () => {
		const o = type({ "['foo' | 'bar']": "string" })
		attest<{ foo: string; bar: string }>(o.infer)
	})
	test("non-enumerable indexed union", () => {
		const o = type({ "[string | symbol]": "string" })
		attest<{ [x: string]: string; [x: symbol]: string }>(o.infer)
	})
	test("multiple indexed", () => {
		const o = type({
			"[string]": "string",
			"[symbol]": "number"
		})
		attest<{ [x: string]: string; [x: symbol]: number }>(o.infer)
	})
	test("all key kinds", () => {
		const o = type({
			"[string]": "string",
			required: "'foo'",
			"optional?": "'bar'"
		})
		attest<{ [x: string]: string; required: "foo"; optional?: "bar" }>(o.infer)
	})
	test("index key from scope", () => {
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
	test("syntax error in index definition", () => {
		attest(() =>
			type({
				// @ts-expect-error
				"[unresolvable]": "string"
			})
		).throwsAndHasTypeError(writeUnresolvableMessage("unresolvable"))
	})

	test("does not allow syntax error message as value", () => {
		attest(() =>
			type({
				// @ts-expect-error
				"[unresolvable]": "'unresolvable' is unresolvable"
			})
		).throwsAndHasTypeError(writeUnresolvableMessage("unresolvable"))
	})

	test("semantic error in index definition", () => {
		attest(() =>
			type({
				// @ts-expect-error
				"[symbol<5]": "string"
			})
		).throwsAndHasTypeError(writeUnboundableMessage("symbol"))
	})

	test("invalid key type for index definition", () => {
		attest(() =>
			type({
				// @ts-expect-error
				"[object]": "string"
			})
		).throwsAndHasTypeError(writeInvalidPropertyKeyMessage("object"))
	})

	test("does not allow invalid key type error as value", () => {
		attest(() =>
			type({
				// @ts-expect-error
				"[object]":
					"Indexed key definition 'object' must be a string, number or symbol"
			})
		).throwsAndHasTypeError(writeInvalidPropertyKeyMessage("object"))
	})

	test("nested", () => {
		const t = type({ "a?": { b: "boolean" } })
		attest<{ a?: { b: boolean } }>(t.infer)
	})
	test("intersections", () => {
		const a = { "a?": "string" } as const
		const b = { b: "string" } as const
		const c = { "c?": "string" } as const
		const abc = type(a).and(b).and(c)
		attest<{ a?: string; b: string; c?: string }>(abc.infer)
		attest(abc.condition).equals(type({ ...a, ...b, ...c }).condition)
		attest(abc.condition).equals(type([[a, "&", b], "&", c]).condition)
	})
	test("traverse optional", () => {
		const o = type({ "a?": "string" }).configure({ keys: "strict" })
		attest(o({ a: "a" }).data).snap({ a: "a" })
		attest(o({}).data).snap({})
		attest(o({ a: 1 }).problems?.summary).snap(
			"a must be a string (was number)"
		)
	})
	test("intersection", () => {
		const t = type({ a: "number" }).and({ b: "boolean" })
		// Should be simplified from {a: number} & {b: boolean} to {a: number, b: boolean}
		attest(t.infer).type.toString.snap("{ a: number; b: boolean; }")
		attest(t.condition).is(type({ a: "number", b: "boolean" }).condition)
	})
	test("escaped optional token", () => {
		const t = type({ "a\\?": "string" })
		attest<{ "a?": string }>(t.infer)
	})
	test("escaped index", () => {
		const o = type({ "\\[string]": "string" })
		attest<{ "[string]": string }>(o.infer)
	})
	test("multiple bad strict", () => {
		const t = type({ a: "string", b: "boolean" }).configure({
			keys: "strict"
		})
		attest(t({ a: 1, b: 2 }).problems?.summary).snap(
			"a must be a string (was number)\nb must be boolean (was number)"
		)
	})
})

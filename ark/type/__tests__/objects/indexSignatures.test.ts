import { attest, contextualize } from "@ark/attest"
import {
	registeredReference,
	writeInvalidPropertyKeyMessage,
	writeUnboundableMessage,
	writeUnresolvableMessage
} from "@ark/schema"
import { printable } from "@ark/util"
import { scope, type } from "arktype"
import type { string } from "arktype/internal/keywords/ast.ts"
import {
	writeInvalidSpreadTypeMessage,
	writeInvalidUndeclaredBehaviorMessage
} from "arktype/internal/parser/objectLiteral.ts"
import { writeUnexpectedCharacterMessage } from "arktype/internal/parser/string/shift/operator/operator.ts"

contextualize(() => {
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

		attest(o({ a: 1 }).toString()).snap("a must be a string (was a number)")
		attest(o({ a: true, b: false }).toString())
			.snap(`a must be a string (was boolean)
b must be a string (was boolean)`)
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
		).equals(`str must be a string (was a number)
value at [${symName}] must be a number (was a string)`)
	})

	it("all key kinds", () => {
		const o = type({
			"[string]": "string",
			required: "'foo'",
			"optional?": "'bar'"
		})
		attest<{ [x: string]: string; required: "foo"; optional?: "bar" }>(o.infer)
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
other must be a string (was a bigint)`)
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

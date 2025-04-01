import { attest, contextualize } from "@ark/attest"
import {
	writeInvalidPropertyKeyMessage,
	writeUnboundableMessage,
	writeUnresolvableMessage
} from "@ark/schema"
import { printable } from "@ark/util"
import { scope, type } from "arktype"
import { writeUnexpectedCharacterMessage } from "arktype/internal/parser/shift/operator/operator.ts"

contextualize(() => {
	it("string index", () => {
		const O = type({ "[string]": "string" })
		attest<{ [x: string]: string }>(O.infer)
		attest(O.json).snap({
			domain: "object",
			index: [{ signature: "string", value: "string" }]
		})

		attest(O({})).equals({})
		attest(O({ a: "a", b: "b" })).equals({ a: "a", b: "b" })

		const validWithSymbol = { a: "a", [Symbol()]: null }
		attest(validWithSymbol).equals(validWithSymbol)

		attest(O({ a: 1 }).toString()).snap("a must be a string (was a number)")
		attest(O({ a: true, b: false }).toString())
			.snap(`a must be a string (was boolean)
b must be a string (was boolean)`)
	})

	it("symbol index", () => {
		const O = type({ "[symbol]": "1" })
		attest<{ [x: symbol]: 1 }>(O.infer)
		attest(O.json).snap({
			domain: "object",
			index: [{ signature: "symbol", value: { unit: 1 } }]
		})

		attest(O({})).equals({})

		attest(O({ a: 999 })).unknown.snap({ a: 999 })

		const zildjian = Symbol()
		const zildjianName = printable(zildjian)

		// I've been dope, suspenseful with a pencil
		// Ever since...
		const prince = Symbol()
		const princeName = printable(prince)

		attest(O({ [zildjian]: 1, [prince]: 1 })).equals({
			[zildjian]: 1,
			[prince]: 1
		})

		attest({ a: 0, [zildjian]: 1 }).equals({ a: 0, [zildjian]: 1 })

		attest(O({ [zildjian]: 0 }).toString()).equals(
			`value at [${zildjianName}] must be 1 (was 0)`
		)
		attest(O({ [prince]: null, [zildjian]: undefined }).toString())
			.snap(`value at [${princeName}] must be 1 (was null)
value at [${zildjianName}] must be 1 (was undefined)`)
	})

	it("enumerable indexed union", () => {
		const O = type({ "['foo' | 'bar']": "string" })
		const Expected = type({ foo: "string", bar: "string" })
		attest<typeof Expected>(O)
		attest(O.json).equals(Expected.json)
	})

	it("non-enumerable indexed union", () => {
		const O = type({ "[string | symbol]": "string" })
		attest<{ [x: string]: string; [x: symbol]: string }>(O.infer)
		attest(O.json).snap({
			domain: "object",
			index: [{ signature: ["string", "symbol"], value: "string" }]
		})
	})

	it("multiple indexed", () => {
		const O = type({
			"[string]": "string",
			"[symbol]": "number"
		})
		attest<{ [x: string]: string; [x: symbol]: number }>(O.infer)
		attest(O.json).snap({
			index: [
				{ value: "string", signature: "string" },
				{ value: "number", signature: "symbol" }
			],
			domain: "object"
		})

		attest(O({})).equals({})
		attest(O({ foo: "f" })).equals({ foo: "f" })

		const sym = Symbol()

		const symName = printable(sym)

		const validWithStringsAndSymbols = {
			str: "string",
			[sym]: 8675309
		}

		attest(O(validWithStringsAndSymbols)).equals(validWithStringsAndSymbols)

		attest(
			O({
				str: 100,
				[sym]: "💯"
			}).toString()
		).equals(`str must be a string (was a number)
value at [${symName}] must be a number (was a string)`)
	})

	it("all key kinds", () => {
		const O = type({
			"[string]": "string",
			required: "'foo'",
			"optional?": "'bar'"
		})
		attest<{ [x: string]: string; required: "foo"; optional?: "bar" }>(O.infer)
		attest(O.json).snap({
			domain: "object",
			required: [{ key: "required", value: { unit: "foo" } }],
			optional: [{ key: "optional", value: { unit: "bar" } }],
			index: [{ signature: "string", value: "string" }]
		})

		const valid: typeof O.infer = { required: "foo", other: "bar" }
		attest(O(valid)).equals(valid)
		attest(
			O({
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

		const Expected = type({ "[symbol]": "string" }).and({
			foo: "string",
			bar: "string",
			baz: "string"
		})

		attest(types.obj.json).snap(Expected.json)
	})

	it("intersection with named", () => {
		const T = type({ "[string]": "4" }).and({ "a?": "1" })
		attest<{
			[k: string]: 4
			a?: never
		}>(T.infer)
		attest(T.json).snap({
			optional: [{ key: "a", value: { unit: 1 } }],
			index: [{ value: { unit: 4 }, signature: "string" }],
			domain: "object"
		})
	})

	it("intersction with right required", () => {
		const T = type({ "a?": "true" }).and({ a: "boolean" })
		attest<{ a: true }>(T.infer)
		const Expected = type({
			a: "true"
		})
		attest(T.json).equals(Expected.json)
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
		const O = type({ "\\[string]": "string" })
		attest<{ "[string]": string }>(O.infer)
		attest(O.json).snap({
			domain: "object",
			required: [{ key: "[string]", value: "string" }]
		})
	})

	// https://github.com/arktypeio/arktype/issues/1040
	it("can constrain optional keys", () => {
		const Repro = type({
			normal: "string>0",
			"optional?": "string>0"
		})

		type Expected = { normal: string; optional?: string }

		attest<Expected, typeof Repro.infer>()
		attest<Expected, typeof Repro.inferIn>()

		attest(Repro.expression).snap(
			"{ normal: string >= 1, optional?: string >= 1 }"
		)
	})
})

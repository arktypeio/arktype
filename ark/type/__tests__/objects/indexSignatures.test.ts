import { attest, contextualize } from "@ark/attest"
import {
	writeInvalidPropertyKeyMessage,
	writeUnboundableMessage,
	writeUnresolvableMessage
} from "@ark/schema"
import { printable } from "@ark/util"
import { scope, type } from "arktype"
import { writeOptionalIndexKeyMessage } from "arktype/internal/parser/objectLiteral.ts"
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
			optional: [{ key: "a", value: [] }],
			index: [{ value: { unit: 4 }, signature: "string" }],
			domain: "object"
		})
	})

	it("prop and opposing index", () => {
		attest(() => type({ kind: "'b'" }).and({ "[string]": "object" })).throws(
			"Intersection at kind of string and object results in an unsatisfiable type"
		)
		attest(() =>
			type({ a: "string.numeric.parse" }).and({ "[string]": "number" })
		).throws(
			"Intersection at a of string and number results in an unsatisfiable type"
		)
		attest(
			type({ kind: "'b'" })
				.or({ "[string]": "object" })
				.and({ "[string]": "object" }).expression
		).snap("{ [string]: object }")
	})

	it("parses a declared key its index signature also checks", () => {
		const T = type({ a: "string.numeric.parse", "[string]": "string | number" })
		attest<{ [x: string]: string | number; a: string }>(T.inferIn)
		attest<{ [x: string]: string | number; a: number }>(T.infer)
		attest(T({ a: "1", b: "b" })).equals({ a: 1, b: "b" })
		attest(T({ a: "one" }).toString()).snap(
			'a must be a well-formed numeric string (was "one")'
		)
		attest(T({ b: "b" }).toString()).snap("a must be a string (was missing)")
	})

	it("defaults a declared key its index signature also checks", () => {
		const T = type({ a: "number = 5", "[string]": "number" })
		attest<{ [x: string]: number; a?: number }>(T.inferIn)
		attest<{ [x: string]: number; a: number }>(T.infer)
		attest(T({ b: 1 })).snap({ b: 1, a: 5 })
	})

	it("parses a symbol key its index signature also checks", () => {
		const s = Symbol()
		const T = type({
			[s]: "string.numeric.parse",
			"[symbol]": "string | number"
		})
		attest<{ [x: symbol]: string | number; [s]: number }>(T.infer)
	})

	it("fail-fast index branch", () => {
		const $ = scope({})
		const T = $.type({ kind: "'c'", p0: "boolean" }).or({
			"[string]": { p2: "object" }
		})

		attest(T({ kind: { bogus: true }, p0: true }).toString()).snap(
			'kind.p2 must be an object (was missing) or kind must be "c" (was an object)'
		)
	})

	it("keeps no error from a signature rejecting a key", () => {
		const $ = scope({})
		const K = $.type("string").narrow(
			(s, ctx) => s.startsWith("a") || ctx.mustBe("prefixed with a")
		)
		const T = $.type.Record(K, "number")
		const data = { ab: 1, x: 2 }
		attest(T(data)).equals(data)
		attest(T.allows(data)).equals(true)
		attest(T({ ab: "1", x: 2 }).toString()).snap(
			"ab must be a number (was a string)"
		)
		attest(T.onUndeclaredKey("reject")(data).toString()).snap(
			"x must be removed"
		)
		attest(T.onUndeclaredKey("delete")(data)).equals({ ab: 1 })
		attest($.type.Record(K, "string.numeric.parse")({ ab: "1", x: 2 })).equals({
			ab: 1,
			x: 2
		})
	})

	it("checks keys against a signature reading ctx that another Type compiled first", () => {
		const $ = scope({})
		const K = $.type("string").narrow(
			(s, ctx) => s.length > 5 || ctx.mustBe("long")
		)
		const T = $.type({ a: "number" }).and($.type.Record(K, "string"))
		attest(T.allows({ a: 1, ab: 2, abcdefg: "x" })).equals(true)
		attest(T({ a: 1, abcdefg: 2 }).toString()).snap(
			"abcdefg must be a string (was a number)"
		)
	})

	it("checks a declared key against a signature reading ctx's root", () => {
		const types = scope({
			listed: [
				"string",
				":",
				(k, ctx) => (ctx.root as { listed: string[] }).listed.includes(k)
			],
			t: { listed: "string[]", a: "string | number", "[listed]": "string" }
		}).export()
		const T = type({ listed: "string[]", a: "string | number" }).and(
			type.Record(types.listed, "string")
		)
		const data = { listed: [], a: 1 }
		attest(types.t(data)).unknown.equals(data)
		attest(T(data)).unknown.equals(data)
		attest(types.t({ listed: ["a"], a: 1 }).toString()).snap(
			"a must be a string (was a number)"
		)
		attest(T({ listed: ["a"], a: 1 }).toString()).snap(
			"a must be a string (was a number)"
		)
		attest(
			type("string")
				.or(T)({ listed: ["a"], a: 1 })
				.toString()
		).snap("a must be a string (was a number)")
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

	// https://github.com/arktypeio/arktype/issues/1525
	it("optional index", () => {
		attest(() =>
			type({
				// @ts-expect-error
				"[string]?": "number"
			})
		).throwsAndHasTypeError(writeOptionalIndexKeyMessage("[string]"))
	})

	it("escaped optional index", () => {
		const O = type({ "\\[string]?": "string" })
		attest<{ "[string]"?: string }>(O.infer)
		attest(O.json).snap({
			optional: [{ key: "[string]", value: "string" }],
			domain: "object"
		})
		attest(O({})).equals({})
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

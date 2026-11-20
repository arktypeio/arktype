import { attest, contextualize } from "@ark/attest"
import { rootSchema, writeUnresolvableMessage } from "@ark/schema"
import { type } from "arktype"
import { writeMissingRightOperandMessage } from "arktype/internal/parser/shift/operand/unenclosed.ts"
import { writeUnexpectedTupleElementsMessage } from "arktype/internal/parser/tupleExpressions.ts"

const anyType: any = type

contextualize(() => {
	describe("tuple expressions", () => {
		it("nested", () => {
			const T = type(["string|bigint", "|", ["number", "|", "boolean"]])
			attest<string | number | bigint | boolean>(T.infer)
		})

		it("autocompletion", () => {
			// @ts-expect-error
			attest(() => type([""])).completions({
				"": [
					"...",
					"===",
					"Array",
					"ArrayBuffer",
					"BigInt64Array",
					"BigUint64Array",
					"Blob",
					"Date",
					"Error",
					"Exclude",
					"Extract",
					"File",
					"Float32Array",
					"Float64Array",
					"FormData",
					"Function",
					"Headers",
					"Int16Array",
					"Int32Array",
					"Int8Array",
					"Key",
					"Map",
					"Merge",
					"Omit",
					"Partial",
					"Pick",
					"Promise",
					"Record",
					"RegExp",
					"Request",
					"Required",
					"Response",
					"Set",
					"TypedArray",
					"URL",
					"Uint16Array",
					"Uint32Array",
					"Uint8Array",
					"Uint8ClampedArray",
					"WeakMap",
					"WeakSet",
					"bigint",
					"boolean",
					"false",
					"instanceof",
					"keyof",
					"never",
					"null",
					"number",
					"object",
					"string",
					"symbol",
					"this",
					"true",
					"undefined",
					"unknown"
				]
			})
			// @ts-expect-error
			attest(() => type(["string", ""])).completions({
				"": [
					"&",
					"...",
					":",
					"=",
					"=>",
					"?",
					"@",
					"Array",
					"ArrayBuffer",
					"BigInt64Array",
					"BigUint64Array",
					"Blob",
					"Date",
					"Error",
					"Exclude",
					"Extract",
					"File",
					"Float32Array",
					"Float64Array",
					"FormData",
					"Function",
					"Headers",
					"Int16Array",
					"Int32Array",
					"Int8Array",
					"Key",
					"Map",
					"Merge",
					"Omit",
					"Partial",
					"Pick",
					"Promise",
					"Record",
					"RegExp",
					"Request",
					"Required",
					"Response",
					"Set",
					"TypedArray",
					"URL",
					"Uint16Array",
					"Uint32Array",
					"Uint8Array",
					"Uint8ClampedArray",
					"WeakMap",
					"WeakSet",
					"[]",
					"bigint",
					"boolean",
					"false",
					"keyof",
					"never",
					"null",
					"number",
					"object",
					"string",
					"symbol",
					"this",
					"true",
					"undefined",
					"unknown",
					"|",
					"|>"
				]
			})
		})

		it("missing right operand", () => {
			// @ts-expect-error
			attest(() => type(["string", "|"])).throwsAndHasTypeError(
				writeMissingRightOperandMessage("|", "")
			)
			// @ts-expect-error
			attest(() => type(["string", "&"])).throwsAndHasTypeError(
				writeMissingRightOperandMessage("&", "")
			)
			// @ts-expect-error
			attest(() => type(["string", "|>"])).throwsAndHasTypeError(
				writeMissingRightOperandMessage("|>", "")
			)
		})

		it("nested parse error", () => {
			attest(() => {
				// @ts-expect-error
				type(["string", "|", "numbr"])
			}).throwsAndHasTypeError(writeUnresolvableMessage("numbr"))
		})

		it("nested object parse error", () => {
			attest(() => {
				// @ts-expect-error
				type([{ s: "strng" }, "|", "number"])
			}).throwsAndHasTypeError(writeUnresolvableMessage("strng"))
		})

		it("doesn't coerce non-string elements to operators", () => {
			let coercions = 0
			class Opaque {
				toString() {
					coercions++
					return "|"
				}
			}
			const T = type(["string", new Opaque(), "number"] as never)
			attest(T.expression).snap("[string, {}, number]")
			attest(coercions).equals(0)
		})

		it("prototype keys are not operators", () => {
			attest(() => {
				// @ts-expect-error
				type(["string", "toString"])
			}).throwsAndHasTypeError(writeUnresolvableMessage("toString"))
		})

		it("rejects trailing elements on infix, postfix, and prefix operators", () => {
			const cases: [unknown[], string][] = [
				[
					["string", "&", "/a/", "&", "/b/"],
					`ParseError: ${writeUnexpectedTupleElementsMessage("&", 3, 5)}`
				],
				[
					["'a'", "|", "'b'", "|", "'c'"],
					`ParseError: ${writeUnexpectedTupleElementsMessage("|", 3, 5)}`
				],
				[
					["number", "|", "string", "extra"],
					`ParseError: ${writeUnexpectedTupleElementsMessage("|", 3, 4)}`
				],
				[
					["string", "|>", "string.trim", "|>", "string"],
					`ParseError: ${writeUnexpectedTupleElementsMessage("|>", 3, 5)}`
				],
				[
					["string", "[]", "extra"],
					`ParseError: ${writeUnexpectedTupleElementsMessage("[]", 2, 3)}`
				],
				[
					["string", "?", "extra"],
					`ParseError: ${writeUnexpectedTupleElementsMessage("?", 2, 3)}`
				],
				[
					["string", "=", "a", "extra"],
					`ParseError: ${writeUnexpectedTupleElementsMessage("=", 3, 4)}`
				],
				[
					["keyof", { a: "string" }, "extra"],
					`ParseError: ${writeUnexpectedTupleElementsMessage("keyof", 2, 3)}`
				],
				[
					["string", ":", (s: string) => s.length > 0, "extra"],
					`ParseError: ${writeUnexpectedTupleElementsMessage(":", 3, 4)}`
				],
				[
					["string", "=>", (s: string) => s.length, "extra"],
					`ParseError: ${writeUnexpectedTupleElementsMessage("=>", 3, 4)}`
				],
				[
					["string", "@", "desc", "self", "extra"],
					`ParseError: ${writeUnexpectedTupleElementsMessage("@", "3 or 4", 5)}`
				]
			]

			for (const [def, expected] of cases) {
				attest(() => anyType(def)).throws(expected)
				attest(() => anyType(...def)).throws(expected)
			}
		})

		it("rejects malformed default and optional tuple expressions inside objects and tuples", () => {
			const extraDefault = `ParseError: ${writeUnexpectedTupleElementsMessage("=", 3, 4)}`
			const missingDefault = `ParseError: ${writeMissingRightOperandMessage("=", "")}`
			const extraOptional = `ParseError: ${writeUnexpectedTupleElementsMessage("?", 2, 3)}`

			attest(() => anyType({ a: ["number", "=", 5, "x"] })).throws(extraDefault)
			attest(() => anyType([["number", "=", 5, "x"]])).throws(extraDefault)
			attest(() => anyType({ a: ["number", "="] })).throws(missingDefault)
			attest(() => anyType([["number", "="]])).throws(missingDefault)
			attest(() => anyType({ a: ["number", "?", "x"] })).throws(extraOptional)
			attest(() => anyType([["number", "?", "x"]])).throws(extraOptional)

			attest(type({ a: ["number", "=", 5] }).expression).snap(
				"{ a: number = 5 }"
			)
			attest(type([["number", "=", 5]]).expression).snap("[number = 5]")
			attest(type({ a: ["number", "?"] }).expression).snap("{ a?: number }")
			attest(type([["number", "?"]]).expression).snap("[number?]")
		})

		it("rejects missing right operands on prefix, functional, meta, and default operators", () => {
			const missing: [unknown[], string][] = [
				[
					["keyof"],
					`ParseError: ${writeMissingRightOperandMessage("keyof", "")}`
				],
				[
					["string", ":"],
					`ParseError: ${writeMissingRightOperandMessage(":", "")}`
				],
				[
					["string", "=>"],
					`ParseError: ${writeMissingRightOperandMessage("=>", "")}`
				],
				[
					["string", "@"],
					`ParseError: ${writeMissingRightOperandMessage("@", "")}`
				],
				[
					["string", "="],
					`ParseError: ${writeMissingRightOperandMessage("=", "")}`
				]
			]
			for (const [def, expected] of missing)
				attest(() => anyType(def)).throws(expected)
		})

		it("accepts valid arities including 3- and 4-element @ and variadic === / instanceof", () => {
			attest(type(["string", "[]"]).expression).snap("string[]")
			attest(type(["keyof", { a: "string" }]).expression).snap('"a"')
			attest(type(["string", "@", "a label"]).description).equals("a label")
			attest(
				type([
					{ a: "string", b: "number" },
					"@",
					{ description: "str" },
					{
						kind: "domain",
						where: d => d.assertIs("domain").domain === "string"
					}
				]).get("a").description
			).equals("str")
			attest(type(["===", "a", "b", "c"]).expression).snap('"a" | "b" | "c"')
			attest(type(["instanceof", Date, Map]).expression).snap("Date | Map")
		})
	})

	describe("root expression", () => {
		it("=== single", () => {
			const T = type("===", 5)
			attest<5>(T.infer)
			attest(T.json).equals(type("5").json)
		})

		it("=== branches", () => {
			const T = type("===", "foo", "bar", "baz")
			attest<"foo" | "bar" | "baz">(T.infer)
			attest(T.json).snap([{ unit: "bar" }, { unit: "baz" }, { unit: "foo" }])
		})

		it("instanceof single", () => {
			const T = type("instanceof", RegExp)
			attest<RegExp>(T.infer)
			const Expected = rootSchema(RegExp)
			attest(T.json).equals(Expected.json)
		})

		it("instanceof branches", () => {
			const T = type("instanceof", Array, Date)
			attest<unknown[] | Date>(T.infer)
			const Expected = rootSchema([Array, Date])
			attest(T.json).equals(Expected.json)
		})

		it("postfix", () => {
			const T = type({ a: "string" }, "[]")
			attest<{ a: string }[]>(T.infer)
			attest(T.json).equals(type({ a: "string" }).array().json)
		})

		it("infix", () => {
			const T = type({ a: "string" }, "|", { b: "boolean" })
			attest<
				| {
						a: string
				  }
				| {
						b: boolean
				  }
			>(T.infer)

			attest(T.json).equals(type({ a: "string" }).or({ b: "boolean" }).json)
		})

		it("morph", () => {
			const T = type({ a: "string" }, "=>", In => ({ b: In.a }))
			attest(T).type.toString.snap(
				"Type<(In: { a: string }) => Out<{ b: string }>, {}>"
			)
			attest(T.expression).snap("(In: { a: string }) => Out<unknown>")
		})

		it("narrow", () => {
			const T = type(
				{ a: "string" },
				":",
				(In): In is { a: "foo" } => In.a === "foo"
			)
			attest<{ a: "foo" }>(T.infer)
		})

		it("tuple as second arg", () => {
			// this case is not fundamentally unique but TS has a hard time
			// narrowing tuples in contexts like this
			const T = type("keyof", [{ a: "string" }, "&", { b: "boolean" }])
			const Expected = type("'a' | 'b'")
			attest<typeof Expected.infer>(T.infer)
			attest(T.json).equals(Expected.json)
		})
	})
})

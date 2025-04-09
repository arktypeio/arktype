import { attest, contextualize } from "@ark/attest"
import { rootSchema, writeUnresolvableMessage } from "@ark/schema"
import { type } from "arktype"
import { writeMissingRightOperandMessage } from "arktype/internal/parser/shift/operand/unenclosed.ts"

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
					"Blob",
					"Date",
					"Error",
					"Exclude",
					"Extract",
					"File",
					"FormData",
					"Function",
					"Headers",
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
					"Blob",
					"Date",
					"Error",
					"Exclude",
					"Extract",
					"File",
					"FormData",
					"Function",
					"Headers",
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

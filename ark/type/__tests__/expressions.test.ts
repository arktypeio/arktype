import { attest, contextualize } from "@arktype/attest"
import { internalSchema, writeUnresolvableMessage } from "@arktype/schema"
import { type } from "arktype"
import { writeMissingRightOperandMessage } from "../parser/string/shift/operand/unenclosed.js"

contextualize(() => {
	describe("tuple expressions", () => {
		it("nested", () => {
			const t = type(["string|bigint", "|", ["number", "|", "boolean"]])
			attest<string | number | bigint | boolean>(t.infer)
		})

		it("autocompletion", () => {
			// @ts-expect-error
			attest(() => type([""])).completions({
				"": [
					"...",
					"===",
					"Array",
					"Date",
					"Error",
					"Function",
					"Map",
					"Promise",
					"Record",
					"RegExp",
					"Set",
					"WeakMap",
					"WeakSet",
					"alpha",
					"alphanumeric",
					"any",
					"bigint",
					"boolean",
					"creditCard",
					"digits",
					"email",
					"false",
					"format",
					"instanceof",
					"integer",
					"ip",
					"keyof",
					"lengthBoundable",
					"lowercase",
					"never",
					"nonNegativeIntegerString",
					"null",
					"number",
					"object",
					"parse",
					"propertyKey",
					"semver",
					"string",
					"symbol",
					"this",
					"true",
					"undefined",
					"unknown",
					"uppercase",
					"url",
					"uuid",
					"void"
				]
			})
			// @ts-expect-error
			attest(() => type(["string", ""])).completions({
				"": [
					"&",
					"...",
					":",
					"=>",
					"?",
					"@",
					"Array",
					"Date",
					"Error",
					"Function",
					"Map",
					"Promise",
					"Record",
					"RegExp",
					"Set",
					"WeakMap",
					"WeakSet",
					"[]",
					"alpha",
					"alphanumeric",
					"any",
					"bigint",
					"boolean",
					"creditCard",
					"digits",
					"email",
					"false",
					"format",
					"integer",
					"ip",
					"keyof",
					"lengthBoundable",
					"lowercase",
					"never",
					"nonNegativeIntegerString",
					"null",
					"number",
					"object",
					"parse",
					"propertyKey",
					"semver",
					"string",
					"symbol",
					"this",
					"true",
					"undefined",
					"unknown",
					"uppercase",
					"url",
					"uuid",
					"void",
					"|"
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
			const t = type("===", 5)
			attest<5>(t.infer)
			attest(t.json).equals(type("5").json)
		})

		it("=== branches", () => {
			const t = type("===", "foo", "bar", "baz")
			attest<"foo" | "bar" | "baz">(t.infer)
			attest(t.json).snap([{ unit: "bar" }, { unit: "baz" }, { unit: "foo" }])
		})

		it("instanceof single", () => {
			const t = type("instanceof", RegExp)
			attest<RegExp>(t.infer)
			const expected = internalSchema(RegExp)
			attest(t.json).equals(expected.json)
		})

		it("instanceof branches", () => {
			const t = type("instanceof", Array, Date)
			attest<unknown[] | Date>(t.infer)
			const expected = internalSchema([Array, Date])
			attest(t.json).equals(expected.json)
		})

		it("postfix", () => {
			const t = type({ a: "string" }, "[]")
			attest<{ a: string }[]>(t.infer)
			attest(t.json).equals(type({ a: "string" }).array().json)
		})

		it("infix", () => {
			const t = type({ a: "string" }, "|", { b: "boolean" })
			attest<
				| {
						a: string
				  }
				| {
						b: boolean
				  }
			>(t.infer)

			attest(t.json).equals(type({ a: "string" }).or({ b: "boolean" }).json)
		})
		// TODO: infinitely deep why?
		// it("morph", () => {
		// 	const t = type({ a: "string" }, "=>", (In) => ({ b: In.a }))
		// 	attest<Type<(In: { a: string }) => Out<{ b: string }>, Ark>>(t)
		// })

		it("narrow", () => {
			const t = type(
				{ a: "string" },
				":",
				(In): In is { a: "foo" } => In.a === "foo"
			)
			attest<{ a: "foo" }>(t.infer)
		})

		it("tuple as second arg", () => {
			// this case is not fundamentally unique but TS has a hard time
			// narrowing tuples in contexts like this
			const t = type("keyof", [{ a: "string" }, "&", { b: "boolean" }])
			const expected = type("'a' | 'b'")
			attest<typeof expected.infer>(t.infer)
			attest(t.json).equals(expected.json)
		})
	})
})

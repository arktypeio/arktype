import { attest } from "@arktype/attest"
import { node } from "@arktype/schema"
import type { Out } from "arktype"
import { type } from "arktype"

import {
	writeMissingRightOperandMessage,
	writeUnresolvableMessage
} from "../parser/string/shift/operand/unenclosed.ts"
import { scope } from "../scopes/ark.ts"

describe("tuple expressions", () => {
	it("nested", () => {
		const t = type(["string|bigint", "|", ["number", "|", "boolean"]])
		attest<string | number | bigint | boolean>(t.infer)
	})
	it("autocompletion", () => {
		// @ts-expect-error
		attest(() => type([""])).type.errors(
			`IndexZeroOperator | keyof Ark | "this"`
		)
		// @ts-expect-error
		attest(() => type(["string", ""])).type.errors(
			`"keyof" | keyof Ark | "this" | IndexOneOperator'`
		)
	})
	describe("errors", () => {
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
		// TODO: reenable
		it("this", () => {
			const t = type([{ a: "string" }, "|", { b: "this" }])
			attest(t.infer).type.toString.snap(
				"{ a: string; } | { b: { a: string; } | any; }"
			)
			const types = scope({
				a: {
					a: "string"
				},
				b: {
					b: "expected"
				},
				expected: "a|b"
			}).export()
			attest(t.json).equals(types.expected.json)
		})
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
		attest(t.json).equals(node.units("foo", "bar", "baz").json)
	})
	it("instanceof single", () => {
		const t = type("instanceof", RegExp)
		attest<RegExp>(t.infer)
		attest(t.json).equals(node(RegExp).json)
	})
	it("instanceof branches", () => {
		const t = type("instanceof", Array, Date)
		attest<unknown[] | Date>(t.infer)
		attest(t.json).equals(node(Array, Date).json)
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
	it("morph", () => {
		const t = type({ a: "string" }, "=>", (In) => ({ b: In.a }))
		attest<(In: { a: string }) => Out<{ b: string }>>(t.inferMorph)
	})
	it("narrow", () => {
		const t = type(
			{ a: "string" },
			":",
			(In): In is { a: "foo" } => In.a === "foo"
		)
		attest<{ a: "foo" }>(t.infer)
	})
	it("this", () => {
		const t = type({ a: "string" }, "|", { b: "this" })
		attest(t.infer).type.toString.snap(
			"{ a: string; } | { b: { a: string; } | any; }"
		)
		attest(t.json).equals(type([{ a: "string" }, "|", { b: "this" }]).json)
	})
	it("tuple as second arg", () => {
		// this case is not fundamentally unique but TS has a hard time
		// narrowing tuples in contexts like this
		const t = type("keyof", [
			{ a: "string" },
			"&",
			{ b: "boolean" }
			// as const is required for TS <=5.0
		] as const)
		attest<"a" | "b">(t.infer)
	})
})

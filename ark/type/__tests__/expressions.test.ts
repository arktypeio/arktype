import { attest } from "@arktype/attest"
import { node } from "@arktype/schema"
import type { Out } from "arktype"
import { type } from "arktype"
import { suite, test } from "mocha"
import {
	writeMissingRightOperandMessage,
	writeUnresolvableMessage
} from "../parser/string/shift/operand/unenclosed.js"
import { scope } from "../scopes/ark.js"

suite("tuple expressions", () => {
	test("nested", () => {
		const t = type(["string|bigint", "|", ["number", "|", "boolean"]])
		attest<string | number | bigint | boolean>(t.infer)
	})
	test("autocompletion", () => {
		// @ts-expect-error
		attest(() => type([""])).type.errors(
			`IndexZeroOperator | keyof Ark | "this"`
		)
		// @ts-expect-error
		attest(() => type(["string", ""])).type.errors(
			`"keyof" | keyof Ark | "this" | IndexOneOperator'`
		)
	})
	suite("errors", () => {
		test("missing right operand", () => {
			// @ts-expect-error
			attest(() => type(["string", "|"])).throwsAndHasTypeError(
				writeMissingRightOperandMessage("|", "")
			)
			// @ts-expect-error
			attest(() => type(["string", "&"])).throwsAndHasTypeError(
				writeMissingRightOperandMessage("&", "")
			)
		})
		test("nested parse error", () => {
			attest(() => {
				// @ts-expect-error
				type(["string", "|", "numbr"])
			}).throwsAndHasTypeError(writeUnresolvableMessage("numbr"))
		})
		test("nested object parse error", () => {
			attest(() => {
				// @ts-expect-error
				type([{ s: "strng" }, "|", "number"])
			}).throwsAndHasTypeError(writeUnresolvableMessage("strng"))
		})
		// TODO: reenable
		test("this", () => {
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
			attest(t.condition).equals(types.expected.condition)
		})
	})
})

suite("root expression", () => {
	test("=== single", () => {
		const t = type("===", 5)
		attest<5>(t.infer)
		attest(t.condition).equals(type("5").condition)
	})
	test("=== branches", () => {
		const t = type("===", "foo", "bar", "baz")
		attest<"foo" | "bar" | "baz">(t.infer)
		attest(t.condition).equals(node.units("foo", "bar", "baz").condition)
	})
	test("instanceof single", () => {
		const t = type("instanceof", RegExp)
		attest<RegExp>(t.infer)
		attest(t.condition).equals(node(RegExp).condition)
	})
	test("instanceof branches", () => {
		const t = type("instanceof", Array, Date)
		attest<unknown[] | Date>(t.infer)
		attest(t.condition).equals(node(Array, Date).condition)
	})
	test("postfix", () => {
		const t = type({ a: "string" }, "[]")
		attest<{ a: string }[]>(t.infer)
		attest(t.condition).equals(type({ a: "string" }).array().condition)
	})
	test("infix", () => {
		const t = type({ a: "string" }, "|", { b: "boolean" })
		attest<
			| {
					a: string
			  }
			| {
					b: boolean
			  }
		>(t.infer)

		attest(t.condition).equals(
			type({ a: "string" }).or({ b: "boolean" }).condition
		)
	})
	test("morph", () => {
		const t = type({ a: "string" }, "=>", (In) => ({ b: In.a }))
		attest<(In: { a: string }) => Out<{ b: string }>>(t.inferMorph)
	})
	test("narrow", () => {
		const t = type(
			{ a: "string" },
			":",
			(In): In is { a: "foo" } => In.a === "foo"
		)
		attest<{ a: "foo" }>(t.infer)
	})
	test("this", () => {
		const t = type({ a: "string" }, "|", { b: "this" })
		attest(t.infer).type.toString.snap(
			"{ a: string; } | { b: { a: string; } | any; }"
		)
		attest(t.condition).equals(
			type([{ a: "string" }, "|", { b: "this" }]).condition
		)
	})
	test("tuple as second arg", () => {
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

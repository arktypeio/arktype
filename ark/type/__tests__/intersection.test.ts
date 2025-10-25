import { attest, contextualize } from "@ark/attest"
import {
	intrinsic,
	writeIndivisibleMessage,
	writeUnresolvableMessage,
	writeUnsatisfiableExpressionError
} from "@ark/schema"
import { type } from "arktype"
import { writeMissingRightOperandMessage } from "arktype/internal/parser/shift/operand/unenclosed.ts"

contextualize(() => {
	it("two types", () => {
		const T = type("boolean&true")
		attest<true>(T.infer)
		attest(T.json).is(type("true").json)
	})

	it("intersection parsed before union", () => {
		// Should be parsed as:
		// 1. "0" | ("1"&"string") | "2"
		// 2. "0" | "1" | "2"
		const T = type("'0'|'1'&string|'2'")
		attest<"0" | "1" | "2">(T.infer)
		attest(T.json).equals(type("===", "0", "1", "2").json)
	})

	it("tuple expression", () => {
		const T = type([{ a: "string" }, "&", { b: "number" }])
		attest<{ a: string; b: number }>(T.infer)
		attest(T.json).equals(type({ a: "string", b: "number" }).json)
	})

	it("several types", () => {
		const T = type("unknown&boolean&false")
		attest<false>(T.infer)
		attest(T.json).equals(type("false").json)
	})

	it("method", () => {
		const T = type({ a: "string" }).and({ b: "boolean" })
		attest<{ a: string; b: boolean }>(T.infer)
		attest(T.json).equals(type({ a: "string", b: "boolean" }).json)
	})

	it("chained deep intersections", () => {
		const B = type({ b: "boolean" }, "=>", o => [o.b])
		const T = type({
			a: ["string", "=>", s => s.length]
		})
			.and({
				// unable to inline this due to:
				// https://github.com/arktypeio/arktype/issues/806
				b: B
			})
			.and({
				b: { b: "true" },
				c: "'hello'"
			})
		attest<{
			a: string
			b: {
				b: true
			}
			c: "hello"
		}>(T.in.infer)

		attest<{ a: number; b: boolean[]; c: "hello" }>(T.infer)
	})

	it("bad reference", () => {
		// @ts-expect-error
		attest(() => type("boolean&tru"))
			.throws(writeUnresolvableMessage("tru"))
			.type.errors("boolean&true")
	})

	it("double and", () => {
		// @ts-expect-error
		attest(() => type("boolean&&true")).throws(
			writeMissingRightOperandMessage("&", "&true")
		)
	})

	it("implicit never", () => {
		attest(() => type("string&number")).throws.snap(
			"ParseError: Intersection of string and number results in an unsatisfiable type"
		)
	})

	it("intersection with never", () => {
		attest(() => type("string&never")).throws(
			writeUnsatisfiableExpressionError("Intersection of string and never")
		)
	})

	it("left semantic error", () => {
		// @ts-expect-error
		attest(() => type("string%2&'foo'")).throwsAndHasTypeError(
			writeIndivisibleMessage(intrinsic.string)
		)
	})

	it("right semantic error", () => {
		// @ts-expect-error
		attest(() => type("'foo'&string%2")).throwsAndHasTypeError(
			writeIndivisibleMessage(intrinsic.string)
		)
	})

	it("chained validation error", () => {
		attest(() =>
			// @ts-expect-error
			type({ a: "string" }).and({ b: "what" })
		).throwsAndHasTypeError(writeUnresolvableMessage("what"))
	})

	it("error at path", () => {
		attest(() => type({ a: "string" }).and({ a: "number" })).throws.snap(
			"ParseError: Intersection at a of string and number results in an unsatisfiable type"
		)
	})

	it("never subtype comparisons", () => {
		const MyType = type({
			something: "string"
		})

		attest(type.never.extends(MyType)).equals(true)

		attest(MyType.internal.subsumes(type.never)).equals(true)
	})
})

import { attest } from "@arktype/attest"
import { keywordNodes, writeIndivisibleMessage } from "@arktype/schema"
import { type } from "arktype"
import { keywords } from "../ark.js"
import {
	writeMissingRightOperandMessage,
	writeUnresolvableMessage
} from "../parser/string/shift/operand/unenclosed.js"

describe("intersection", () => {
	it("two types", () => {
		const t = type("boolean&true")
		attest<true>(t.infer)
		attest(t.json).is(type("true").json)
	})
	it("intersection parsed before union", () => {
		// Should be parsed as:
		// 1. "0" | ("1"&"string") | "2"
		// 2. "0" | "1" | "2"
		const t = type("'0'|'1'&string|'2'")
		attest<"0" | "1" | "2">(t.infer)
		attest(t.json).equals(type("===", "0", "1", "2").json)
	})
	it("tuple expression", () => {
		const t = type([{ a: "string" }, "&", { b: "number" }])
		attest<{ a: string; b: number }>(t.infer)
		attest(t.json).equals(type({ a: "string", b: "number" }).json)
	})
	it("several types", () => {
		const t = type("unknown&boolean&false")
		attest<false>(t.infer)
		attest(t.json).equals(type("false").json)
	})
	it("method", () => {
		const t = type({ a: "string" }).and({ b: "boolean" })
		attest<{ a: string; b: boolean }>(t.infer)
		attest(t.json).equals(type({ a: "string", b: "boolean" }).json)
	})
	it("chained deep intersections", () => {
		const b = type({ b: "boolean" }, "=>", (o) => [o.b])
		const t = type({
			a: ["string", "=>", (s) => s.length]
		})
			.and({
				// unable to inline this due to:
				// https://github.com/arktypeio/arktype/issues/806
				b
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
		}>(t.in.infer)

		attest<{ a: number; b: boolean[]; c: "hello" }>(t.infer)
	})
	describe("errors", () => {
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
		it("left semantic error", () => {
			// @ts-expect-error
			attest(() => type("string%2&'foo'")).throwsAndHasTypeError(
				writeIndivisibleMessage(keywordNodes.string)
			)
		})
		it("right semantic error", () => {
			// @ts-expect-error
			attest(() => type("'foo'&string%2")).throwsAndHasTypeError(
				writeIndivisibleMessage(keywordNodes.string)
			)
		})
		it("chained validation", () => {
			attest(() =>
				// @ts-expect-error
				type({ a: "string" }).and({ b: "what" })
			).throwsAndHasTypeError(writeUnresolvableMessage("what"))
		})
		it("at path", () => {
			attest(() => type({ a: "string" }).and({ a: "number" })).throws.snap(
				"ParseError: Intersection at a of string and number results in an unsatisfiable type"
			)
		})
	})
})

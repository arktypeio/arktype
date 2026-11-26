import { attest, contextualize } from "@ark/attest"
import {
	intrinsic,
	writeIndivisibleMessage,
	writeUnresolvableMessage,
	writeUnsatisfiableExpressionError
} from "@ark/schema"
import { scope, type } from "arktype"
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

	it("proto with props", () => {
		const T = type("Date").and({ foo: "string" })
		attest(T.expression).snap("{ foo: string } & Date")
		attest(T.description).snap("{ foo: a string } & a Date")
	})

	it("bounded proto with props", () => {
		const T = type("Date >= d'2023-01-01'").and({ foo: "string" })
		attest(T.description).snap(
			"{ foo: a string } & a Date and January 1, 2023 or later"
		)
		attest(type("Array > 2").and({ foo: "string" }).expression).snap(
			"{ foo: string } & Array >= 3"
		)
	})

	it("empty tuple with props", () => {
		const T = type([]).and({ foo: "string" })
		attest(T.expression).snap("{ foo: string } & []")
	})

	it("nested", () => {
		attest(type("string > 1").array().expression).snap("(string >= 2)[]")
		attest(type("Date").and({ foo: "string" }).array().expression).snap(
			"({ foo: string } & Date)[]"
		)
		attest(type("string > 1 | number").expression).snap("number | string >= 2")
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

	it("relates described unions by their values", () => {
		const Described = type("string | number").describe("a key")
		attest(Described.extends("string | number")).equals(true)
		attest(type("string | number").extends(Described)).equals(true)
		attest(type({ k: Described }).extends({ k: "string | number" })).equals(
			true
		)
		attest(Described.extends("string")).equals(false)
	})

	it("formats multi-key disjoint errors with symbol keys", () => {
		const sym = Symbol("s")
		attest(() =>
			type({
				a: type("TypedArray.Uint8").narrow(() => true),
				[sym]: type.unit(-0)
			}).and({
				kind: [
					type("Date").configure({ expected: () => "d" }),
					"=",
					() => new Date(0)
				],
				"[string.numeric]": "undefined",
				"+": "delete"
			})
		).throws
			.snap(`ParseError: The following intersections result in unsatisfiable types:
• a: Uint8Array & fn and never
• [Symbol(s)]: 0 and never
a is undeclared on a side that deletes undeclared keys.
[Symbol(s)] is undeclared on a side that deletes undeclared keys.
To add them, use .merge(), which takes "+" from the merged object.`)

		attest(() =>
			scope(
				{},
				{
					domain: { message: "Wrong type" },
					required: { message: "Required" }
				}
			)
				.type({ id: "Headers", [sym]: "number.NegativeInfinity" })
				.and({ [sym]: "undefined", "+": "reject" })
		).throws
			.snap(`ParseError: The following intersections result in unsatisfiable types:
• id: Headers and never
• [Symbol(s)]: -Infinity and undefined
id is undeclared on a side that rejects undeclared keys.
To add it, use .merge(), which takes "+" from the merged object.`)

		attest(() =>
			type({ nested: { a: "string", [sym]: "number" } }).and({
				nested: { "+": "delete" }
			})
		).throws
			.snap(`ParseError: The following intersections result in unsatisfiable types:
• nested.a: string and never
• nested[Symbol(s)]: number and never
nested.a is undeclared on a side that deletes undeclared keys.
nested[Symbol(s)] is undeclared on a side that deletes undeclared keys.`)
	})
})

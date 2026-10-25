import { attest, contextualize } from "@ark/attest"
import {
	intrinsic,
	rootSchema,
	writeIndivisibleMessage,
	writeUnresolvableMessage
} from "@ark/schema"
import { type } from "arktype"
import { writeMissingRightOperandMessage } from "arktype/internal/parser/shift/operand/unenclosed.ts"

contextualize(() => {
	it("binary", () => {
		const Binary = type("number|string")
		attest<number | string>(Binary.infer)
		attest(Binary.json).snap(["number", "string"])
	})

	it("nary", () => {
		const Nary = type("false|null|undefined|0|''")
		attest<false | "" | 0 | null | undefined>(Nary.infer)
		const Expected = type("===", false, null, undefined, 0, "")
		attest(Nary.json).equals(Expected.json)
	})

	it("subtype pruning", () => {
		const T = type({ a: "string" }, "|", { a: "'foo'" })
		const Expected = type({ a: "string" })
		attest<typeof Expected>(T)
		attest(T.json).equals(Expected.json)
	})

	it("multiple subtypes pruned", () => {
		const T = type("'foo'|'bar'|string|'baz'|/.*/")
		const Expected = type("string")
		attest<string>(T.infer)
		attest(T.json).equals(Expected.json)
	})

	it("compiled allows checks each of two domains", () => {
		const T = type("number | null")
		// the first data is checked uncompiled
		T.allows(null)
		attest([null, 0, NaN, undefined, "0"].map(v => T.allows(v))).equals([
			true,
			true,
			false,
			false,
			false
		])
	})

	it("compiled apply of one domain or a unit it allows", () => {
		const T = type({ n: "number > 0 | null", s: "string > 0 | undefined" })
		// the first data is checked uncompiled
		T({ n: null, s: undefined })
		attest(T({ n: null, s: undefined })).equals({ n: null, s: undefined })
		attest(T({ n: 0, s: "" }).toString()).snap(`n must be positive (was 0)
s must be non-empty`)
		attest(T({ n: "1", s: null }).toString())
			.snap(`n must be a number or null (was a string)
s must be a string or undefined (was null)`)
	})

	it("boolean is a union of true | false", () => {
		const T = type("true|false")
		attest(T.infer).type.toString("boolean")
		attest(T.json).equals(type("boolean").json)
	})

	it("nested tuple union", () => {
		const T = type(["string|bigint", "|", ["number", "|", "boolean"]])
		attest<string | number | bigint | boolean>(T.infer)
		attest(T.json).equals(type("string|bigint|number|boolean").json)
	})

	it("union of object arrays doesn't throw on non-object element", () => {
		// https://github.com/arktypeio/arktype/issues/1458
		// checking a later element whose basis (object) fails must not attempt
		// an `in` check against a primitive earlier collected element
		const TypeAB = type.or("string", { objB: "string" })
		const TypeC = type({ objC: "string" })
		const TypeABC = type([TypeAB.array(), "|", TypeC.array()])

		attest(
			TypeABC([{ objB: "text b" }, "test a", { objC: "text c" }]).toString()
		).snap(
			"value at [2].objB must be a string (was missing) or value at [0].objC must be a string (was missing)"
		)

		attest(
			TypeABC(["test a", { objB: "text b" }, { objC: "text c" }]).toString()
		).snap(
			"value at [2].objB must be a string (was missing) or value at [0] must be an object (was a string)"
		)
	})

	it("writes each path as its own error would", () => {
		attest(type("number[] | string[]")(["a", 1]).toString()).snap(
			"value at [0] must be a number (was a string) or value at [1] must be a string (was a number)"
		)
		attest(type(["number", "number"]).or(["string"])([1]).toString()).snap(
			"must be exactly length 2 (was 1) or value at [0] must be a string (was a number)"
		)
	})

	it("lists each value a missing key allows once", () => {
		const T = type({ a: "string | number", b: "string" }).or({
			a: "string",
			c: "number"
		})
		attest(T({}).toString()).snap(
			"a must be a string or a number (was missing)"
		)
		const Units = type({ a: "1 | 2", b: "string" }).or({
			a: "2 | 3",
			c: "number"
		})
		attest(Units({}).toString()).snap("a must be 1, 2 or 3 (was missing)")
	})

	it("described", () => {
		const T = type({ a: "string" }).or({ b: "number" }).describe("an a or a b")
		attest(T({}).toString()).snap("must be an a or a b (was an object)")
		attest(T(5).toString()).snap("must be an a or a b (was a number)")
		const Lengths = type("string < 2 | string > 5").describe("short or long")
		attest(Lengths("abc").toString()).snap(
			"must be short or long (was length 3)"
		)
	})

	it("length stress", () => {
		// as of TS 5.1, can handle a max of 46 branches before an inifinitely
		// deep error not the end of the world if this changes slightly, but
		// wanted to make those changes explicit if something reduces it it's
		// also still very responsive up until it hits the limit, so it is
		// likely a safeguard rather than a limitation of the parser
		const T = type(
			"0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45"
		)
		// prettier-ignore
		attest<
				| 0
				| 1
				| 2
				| 3
				| 4
				| 5
				| 6
				| 7
				| 8
				| 9
				| 10
				| 11
				| 12
				| 13
				| 14
				| 15
				| 16
				| 17
				| 18
				| 19
				| 20
				| 21
				| 22
				| 23
				| 24
				| 25
				| 26
				| 27
				| 28
				| 29
				| 30
				| 31
				| 32
				| 33
				| 34
				| 35
				| 36
				| 37
				| 38
				| 39
				| 40
				| 41
				| 42
				| 43
				| 44
				| 45
			>(T.infer)

		attest(T.json).snap([
			{ unit: 0 },
			{ unit: 10 },
			{ unit: 11 },
			{ unit: 12 },
			{ unit: 13 },
			{ unit: 14 },
			{ unit: 15 },
			{ unit: 16 },
			{ unit: 17 },
			{ unit: 18 },
			{ unit: 19 },
			{ unit: 1 },
			{ unit: 20 },
			{ unit: 21 },
			{ unit: 22 },
			{ unit: 23 },
			{ unit: 24 },
			{ unit: 25 },
			{ unit: 26 },
			{ unit: 27 },
			{ unit: 28 },
			{ unit: 29 },
			{ unit: 2 },
			{ unit: 30 },
			{ unit: 31 },
			{ unit: 32 },
			{ unit: 33 },
			{ unit: 34 },
			{ unit: 35 },
			{ unit: 36 },
			{ unit: 37 },
			{ unit: 38 },
			{ unit: 39 },
			{ unit: 3 },
			{ unit: 40 },
			{ unit: 41 },
			{ unit: 42 },
			{ unit: 43 },
			{ unit: 44 },
			{ unit: 45 },
			{ unit: 4 },
			{ unit: 5 },
			{ unit: 6 },
			{ unit: 7 },
			{ unit: 8 },
			{ unit: 9 }
		])
	})

	const expected = () =>
		rootSchema([
			{
				domain: "object",
				required: {
					key: "a",
					value: { domain: "string" }
				}
			},
			{
				domain: "object",
				required: {
					key: "b",
					value: { domain: "number" }
				}
			}
		]).json

	it("tuple", () => {
		const T = type([{ a: "string" }, "|", { b: "number" }])
		attest<{ a: string } | { b: number }>(T.infer)
		attest(T.json).equals(expected())
	})

	it("root", () => {
		const T = type({ a: "string" }, "|", { b: "number" })
		attest<{ a: string } | { b: number }>(T.infer)
		attest(T.json).equals(expected())
	})

	it("chained", () => {
		const T = type({ a: "string" }).or({ b: "number" })
		attest<
			| {
					a: string
			  }
			| {
					b: number
			  }
		>(T.infer)
		attest(T.json).equals(expected())
	})

	it("root autocompletion", () => {
		// @ts-expect-error
		attest(() => type({ a: "s" }, "|", { b: "boolean" })).completions({
			s: ["string", "symbol"]
		})
		// @ts-expect-error
		attest(() => type({ a: "string" }, "|", { b: "b" })).completions({
			b: ["bigint", "boolean"]
		})
	})

	it("bad reference", () => {
		// @ts-expect-error
		attest(() => type("number|strng")).throwsAndHasTypeError(
			writeUnresolvableMessage("strng")
		)
	})

	it("consecutive tokens", () => {
		// @ts-expect-error
		attest(() => type("boolean||null")).throws(
			writeMissingRightOperandMessage("|", "|null")
		)
	})

	it("ends with |", () => {
		// @ts-expect-error
		attest(() => type("boolean|")).throws(
			writeMissingRightOperandMessage("|", "")
		)
	})

	it("long missing union member", () => {
		attest(() =>
			// @ts-expect-error
			type("boolean[]|(string|number|)|object")
		).throws(writeMissingRightOperandMessage("|", ")|object"))
	})

	it("left semantic error", () => {
		// @ts-expect-error
		attest(() => type("symbol%2|string")).throwsAndHasTypeError(
			writeIndivisibleMessage(intrinsic.symbol)
		)
	})

	it("right semantic error", () => {
		// @ts-expect-error
		attest(() => type("string|symbol%2")).throwsAndHasTypeError(
			writeIndivisibleMessage(intrinsic.symbol)
		)
	})

	it("chained bad reference", () => {
		// @ts-expect-error
		attest(() => type("string").or("nummer")).throwsAndHasTypeError(
			writeUnresolvableMessage("nummer")
		)
	})

	it("chained description", () => {
		const T = type("number|string").describe("My custom type")
		attest(T.json).snap({
			branches: [
				{ meta: "My custom type", domain: "number" },
				{ meta: "My custom type", domain: "string" }
			],
			meta: "My custom type"
		})
	})

	it("branches described like Object.prototype members", () => {
		const T = type("string")
			.describe("constructor")
			.or(type("number").describe("valueOf"))
		attest(T.description).snap("valueOf or constructor")
	})

	it("orders units by when they were registered", () => {
		const symbols = Array.from({ length: 11 }, () => Symbol("orderedUnit"))
		for (const symbol of symbols) type.unit(symbol)
		const T = type.enumerated(...[...symbols].reverse())
		attest(T.internal.branches.map(branch => branch.json)).equals(
			symbols.map(symbol => type.unit(symbol).json)
		)
	})

	it("orders strings holding $ and digits by code unit", () => {
		const T = type("'$2' | '$10' | '$ark.fn$9' | '$ark.fn$10'")
		attest(T.expression).snap('"$10" | "$2" | "$ark.fn$10" | "$ark.fn$9"')
	})

	describe("objects alike but for one key", () => {
		it("merge into the union of its values", () => {
			const T = type({ a: "string" }).or({ a: "number" })
			attest<{ a: string } | { a: number }>(T.infer)
			attest(T.json).equals(type({ a: "string | number" }).json)
		})

		it("merge a discriminant", () => {
			const T = type({ kind: "'a'", x: "string" }).or({
				kind: "'b'",
				x: "string"
			})
			attest(T.expression).snap('{ kind: "a" | "b", x: string }')
			attest(T({ x: 5 }).toString()).snap(`kind must be "a" or "b" (was missing)
x must be a string (was a number)`)
		})

		it("keep branches differing in two keys", () => {
			const T = type({ kind: "'a'", x: "string" }).or({
				kind: "'b'",
				x: "number"
			})
			attest(T.expression).snap(
				'{ kind: "a", x: string } | { kind: "b", x: number }'
			)
		})

		it("keep a key only one has", () => {
			const T = type({ a: "string" }).or({ a: "number", b: "string" })
			attest(T.expression).snap("{ a: number, b: string } | { a: string }")
		})

		it("merge required and optional to optional", () => {
			const T = type({ a: "string" }).or({ "a?": "number" })
			attest(T.expression).snap("{ a?: number | string }")
			attest(T({})).equals({})
		})

		it("merge a key optional on one side among others", () => {
			const T = type({ a: "string", b: "number" }).or({
				"a?": "boolean",
				b: "number"
			})
			attest(T.expression).snap("{ b: number, a?: string | false | true }")
		})

		it("keep a default to its branch", () => {
			const T = type({ a: "string" }).or({ a: "number = 5" })
			attest(T.expression).snap("{ a: number = 5 } | { a: string }")
			attest(T({})).equals({ a: 5 })
		})

		it("merge morphs", () => {
			const T = type({ a: "string.numeric.parse" }).or({ a: "number" })
			attest(T.json).equals(type({ a: "string.numeric.parse | number" }).json)
			attest(T({ a: "5" })).equals({ a: 5 })
		})

		it("merge nested", () => {
			const T = type({ a: { b: "string" } }).or({ a: { b: "number" } })
			attest(T.expression).snap("{ a: { b: number | string } }")
		})

		it("reduce merged values", () => {
			const T = type({ a: "0 < number < 5" }).or({ a: "5 <= number < 10" })
			attest(T.expression).snap("{ a: 0 < number < 10 }")
		})

		it("merge alike undeclared keys", () => {
			const T = type({ "+": "reject", a: "string" }).or({
				"+": "reject",
				a: "number"
			})
			attest(T.expression).snap(
				"{ a: number | string, + (undeclared): reject }"
			)
		})

		it("keep differing undeclared keys", () => {
			const T = type({ "+": "reject", a: "string" }).or({ a: "number" })
			attest(T.expression).snap(
				"{ a: number } | { a: string, + (undeclared): reject }"
			)
		})

		it("keep an array and an object", () => {
			const T = type({ a: "string" }).or(type({ a: "number" }).and("string[]"))
			attest(T.expression).snap("{ a: number } & string[] | { a: string }")
		})

		it("keep ordered unions", () => {
			const T = rootSchema({
				branches: [
					{ domain: "object", required: { key: "a", value: "string" } },
					{ domain: "object", required: { key: "a", value: "number" } }
				],
				ordered: true
			})
			attest(T.expression).snap("{ a: string } | { a: number }")
		})

		it("keep differing descriptions", () => {
			const T = type({ a: "string" })
				.describe("an A")
				.or(type({ a: "number" }).describe("a B"))
			attest(T.expression).snap("{ a: number } | { a: string }")
			attest(T(5).toString()).snap("must be a B or an A (was a number)")
		})

		it("merge a shared description", () => {
			const T = type({ a: "string" })
				.describe("an AB")
				.or(type({ a: "number" }).describe("an AB"))
			attest(T.expression).snap("{ a: number | string }")
			attest(T(5).toString()).snap("must be an AB (was a number)")
		})
	})
})

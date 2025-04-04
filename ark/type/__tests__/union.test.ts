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
			s: ["string", "symbol"],
			"|": ["|>"]
		})
		// @ts-expect-error
		attest(() => type({ a: "string" }, "|", { b: "b" })).completions({
			"|": ["|>"],
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
})

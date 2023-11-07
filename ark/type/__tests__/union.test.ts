import { attest } from "@arktype/attest"
import { node, writeIndivisibleMessage } from "@arktype/schema"
import { type } from "arktype"
import { suite, test } from "mocha"
import {
	writeMissingRightOperandMessage,
	writeUnresolvableMessage
} from "../parser/string/shift/operand/unenclosed.js"

suite("union", () => {
	test("binary", () => {
		const binary = type("number|string")
		attest<number | string>(binary.infer)
		// attest(binary.node).snap({ number: true, string: true })
	})
	test("nary", () => {
		const nary = type("false|null|undefined|0|''")
		attest<false | "" | 0 | null | undefined>(nary.infer)
		const expected = node.units(false, null, undefined, 0, "")
		attest(nary.condition).is(expected.condition)
	})
	test("subtype pruning", () => {
		type([{ a: "string" }, "|", { a: "'foo'" }])
	})
	test("multiple subtypes pruned", () => {
		const t = type("'foo'|'bar'|string|'baz'|/.*/")
		attest<string>(t.infer)
		attest(t.condition).is(type("string").condition)
	})
	test("union of true and false reduces to boolean", () => {
		const t = type("true|false")
		attest(t.infer).type.toString("boolean")
		attest(t.condition).equals(type("boolean").condition)
	})
	test("nested tuple union", () => {
		const t = type(["string|bigint", "|", ["number", "|", "boolean"]])
		attest<string | number | bigint | boolean>(t.infer)
		attest(t.condition).equals(type("string|bigint|number|boolean").condition)
	})
	test("length stress", () => {
		// as of TS 5.1, can handle a max of 46 branches before an inifinitely
		// deep error not the end of the world if this changes slightly, but
		// wanted to make those changes explicit if something reduces it it's
		// also still very responsive up until it hits the limit, so it is
		// likely a safeguard rather than a limitation of the parser
		const t = type(
			"0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45"
		)
		// prettier-ignore
		attest<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45>(t.infer)
	})
	suite("expressions", () => {
		const expected = () => node("object").condition
		// node(
		// 	{
		// 		basis: "object",
		// 		props: {
		// 			a: {
		// 				value: { basis: "string" }
		// 			}
		// 		}
		// 	},
		// 	{
		// 		basis: "object",
		// 		props: {
		// 			b: {
		// 				value: [{ basis: ["===", true] }, { basis: ["===", false] }]
		// 			}
		// 		}
		// 	}

		test("tuple", () => {
			const t = type([{ a: "string" }, "|", { b: "boolean" }])
			attest<{ a: string } | { b: boolean }>(t.infer)
			attest(t.condition).equals(expected())
		})
		test("root", () => {
			const t = type({ a: "string" }, "|", { b: "boolean" })
			attest<{ a: string } | { b: boolean }>(t.infer)
			attest(t.condition).equals(expected())
		})
		test("chained", () => {
			const t = type({ a: "string" }).or({ b: "boolean" })
			attest<
				| {
						a: string
				  }
				| {
						b: boolean
				  }
			>(t.infer)
			attest(t.condition).equals(expected())
		})
		test("root autocompletions", () => {
			// @ts-expect-error
			attest(() => type({ a: "s" }, "|", { b: "boolean" })).type.errors(
				`Type '"s"' is not assignable to type '"string" | "symbol" | "semver"'`
			)
			// @ts-expect-error
			attest(() => type({ a: "string" }, "|", { b: "b" })).type.errors(
				`Type '"b"' is not assignable to type '"bigint" | "boolean"'`
			)
		})
	})
	suite("errors", () => {
		test("bad reference", () => {
			// @ts-expect-error
			attest(() => type("number|strng")).throwsAndHasTypeError(
				writeUnresolvableMessage("strng")
			)
		})
		test("consecutive tokens", () => {
			// @ts-expect-error
			attest(() => type("boolean||null")).throws(
				writeMissingRightOperandMessage("|", "|null")
			)
		})
		test("ends with |", () => {
			// @ts-expect-error
			attest(() => type("boolean|")).throws(
				writeMissingRightOperandMessage("|", "")
			)
		})
		test("long missing union member", () => {
			attest(() =>
				// @ts-expect-error
				type("boolean[]|(string|number|)|object")
			).throws(writeMissingRightOperandMessage("|", ")|object"))
		})
		test("left semantic error", () => {
			// @ts-expect-error
			attest(() => type("symbol%2|string")).throwsAndHasTypeError(
				writeIndivisibleMessage("symbol")
			)
		})
		test("right semantic error", () => {
			// @ts-expect-error
			attest(() => type("string|symbol%2")).throwsAndHasTypeError(
				writeIndivisibleMessage("symbol")
			)
		})
		test("chained bad reference", () => {
			// @ts-expect-error
			attest(() => type("string").or("nummer")).throwsAndHasTypeError(
				writeUnresolvableMessage("nummer")
			)
		})
	})
})

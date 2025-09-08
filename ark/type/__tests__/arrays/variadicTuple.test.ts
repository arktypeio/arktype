import { attest, contextualize } from "@ark/attest"
import { postfixAfterOptionalOrDefaultableMessage } from "@ark/schema"
import { scope, type } from "arktype"
import {
	multipleVariadicMesage,
	optionalOrDefaultableAfterVariadicMessage,
	writeNonArraySpreadMessage
} from "arktype/internal/parser/tupleLiteral.ts"

contextualize(() => {
	it("spreads simple arrays", () => {
		const WellRested = type(["string", "...", "number[]"])
		attest<[string, ...number[]]>(WellRested.infer)
		attest(WellRested(["foo"])).equals(["foo"])
		attest(WellRested(["foo", 1, 2])).equals(["foo", 1, 2])
	})

	it("spreads array expressions", () => {
		const GreatSpread = type(["0", "...", "(Date|RegExp)[]"])
		attest<[0, ...(RegExp | Date)[]]>(GreatSpread.infer)
	})

	it("distributes spread unions", () => {
		const T = type(["1", "...", "(Date[] | RegExp[])"])
		attest<[1, ...(Date[] | RegExp[])]>(T.infer)
		const Expected = type(["1", "...", "Date[]"]).or(["1", "...", "RegExp[]"])
		attest(T.json).equals(Expected.json)
	})

	it("distributes spread union tuples", () => {
		const counting = ["2", "3", "4"] as const
		const fibbing = ["1", "2", "3", "5", "8"] as const
		const CountOrFib = type(counting, "|", fibbing)
		attest<[2, 3, 4] | [1, 2, 3, 5, 8]>(CountOrFib.infer)
		const T = type(["1", "...", CountOrFib])
		attest<[1, 2, 3, 4] | [1, 1, 2, 3, 5, 8]>(T.infer)
		const Expected = type(["1", ...counting]).or(["1", ...fibbing])
		attest(T.json).equals(Expected.json)
	})

	it("allows array keyword", () => {
		const types = scope({
			myArrayKeyword: "boolean[]",
			myVariadicKeyword: ["string", "...", "myArrayKeyword"]
		}).export()
		attest<[string, ...boolean[]]>(types.myVariadicKeyword.infer)
	})

	it("errors on non-array", () => {
		attest(() =>
			// @ts-expect-error
			type(["number", "...", "string"])
		).throwsAndHasTypeError(writeNonArraySpreadMessage("string"))
	})

	it("allows multiple fixed spreads", () => {
		const T = type([
			"string",
			"...",
			"number[]",
			"...",
			["boolean", "bigint"],
			"...",
			["symbol"]
		])
		const Expected = type([
			"string",
			"...",
			"number[]",
			"boolean",
			"bigint",
			"symbol"
		])
		attest<[string, ...number[], boolean, bigint, symbol]>(T.infer)
		attest<typeof Expected.infer>(T.infer)
		attest(T.json).equals(Expected.json)
	})

	it("errors on multiple variadic", () => {
		attest(() =>
			// @ts-expect-error
			type(["...", "string[]", "...", "number[]"])
		).throwsAndHasTypeError(multipleVariadicMesage)
	})

	it("error on optional post-variadic in spread", () => {
		// no type error yet, ideally would have one if tuple
		// parsing were more precise for nested spread tuples
		attest(() => type(["...", "string[]", "...", ["string?"]])).throws(
			optionalOrDefaultableAfterVariadicMessage
		)
	})

	it("errors on postfix following optional", () => {
		attest(() =>
			// @ts-expect-error
			type(["number?", "...", "boolean[]", "symbol"])
		).throwsAndHasTypeError(postfixAfterOptionalOrDefaultableMessage)
	})

	it("errors on postfix following defaultable", () => {
		attest(() =>
			// @ts-expect-error
			type(["number = 0", "...", "boolean[]", "symbol"])
		).throwsAndHasTypeError(postfixAfterOptionalOrDefaultableMessage)
	})

	it("doesn't mistake a string literal containing '=' for defaultable", () => {
		const T = type(["'='", "number"])

		attest<["=", number]>(T.t)
		attest(T.infer).type.toString.snap(`["=", number]`)
		attest(T.expression).snap('["=", number]')
	})
})

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
		const wellRested = type(["string", "...", "number[]"])
		attest<[string, ...number[]]>(wellRested.infer)
		attest(wellRested(["foo"])).equals(["foo"])
		attest(wellRested(["foo", 1, 2])).equals(["foo", 1, 2])
	})

	it("spreads array expressions", () => {
		const greatSpread = type(["0", "...", "(Date|RegExp)[]"])
		attest<[0, ...(RegExp | Date)[]]>(greatSpread.infer)
	})

	it("distributes spread unions", () => {
		const t = type(["1", "...", "(Date[] | RegExp[])"])
		attest<[1, ...(Date[] | RegExp[])]>(t.infer)
		const expected = type(["1", "...", "Date[]"]).or(["1", "...", "RegExp[]"])
		attest(t.json).equals(expected.json)
	})

	it("distributes spread union tuples", () => {
		const counting = ["2", "3", "4"] as const
		const fibbing = ["1", "2", "3", "5", "8"] as const
		const countOrFib = type(counting, "|", fibbing)
		attest<[2, 3, 4] | [1, 2, 3, 5, 8]>(countOrFib.infer)
		const t = type(["1", "...", countOrFib])
		attest<[1, 2, 3, 4] | [1, 1, 2, 3, 5, 8]>(t.infer)
		const expected = type(["1", ...counting]).or(["1", ...fibbing])
		attest(t.json).equals(expected.json)
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
		const t = type([
			"string",
			"...",
			"number[]",
			"...",
			["boolean", "bigint"],
			"...",
			["symbol"]
		])
		const expected = type([
			"string",
			"...",
			"number[]",
			"boolean",
			"bigint",
			"symbol"
		])
		attest<[string, ...number[], boolean, bigint, symbol]>(t.infer)
		attest<typeof expected.infer>(t.infer)
		attest(t.json).equals(expected.json)
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
		const t = type(["'='", "number"])

		attest<["=", number]>(t.t)
		attest(t.infer).type.toString.snap(`["=", number]`)
		attest(t.expression).snap('["=", number]')
	})
})

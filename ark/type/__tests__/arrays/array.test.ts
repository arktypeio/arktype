import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"
import { incompleteArrayTokenMessage } from "arktype/internal/parser/shift/operator/operator.ts"
import {
	multipleVariadicMesage,
	writeNonArraySpreadMessage
} from "arktype/internal/parser/tupleLiteral.ts"

contextualize(() => {
	describe("non-tuple", () => {
		it("allows and apply", () => {
			const T = type("string[]")
			attest<string[]>(T.infer)
			attest(T.allows([])).equals(true)
			attest(T([])).snap([])
			attest(T.allows(["foo", "bar"])).equals(true)
			attest(T(["foo", "bar"])).snap(["foo", "bar"])
			attest(T.allows(["foo", "bar", 5])).equals(false)
			attest(T(["foo", "bar", 5]).toString()).snap(
				"value at [2] must be a string (was a number)"
			)
			attest(T.allows([5, "foo", "bar"])).equals(false)
			attest(T([5, "foo", "bar"]).toString()).snap(
				"value at [0] must be a string (was a number)"
			)
		})

		it("nested", () => {
			const T = type("string[][]")
			attest<string[][]>(T.infer)
			attest(T.allows([])).equals(true)
			attest(T([])).snap([])
			attest(T.allows([["foo"]])).equals(true)
			attest(T([["foo"]])).snap([["foo"]])
			attest(T.allows(["foo"])).equals(false)
			attest(T(["foo"]).toString()).snap(
				"value at [0] must be an array (was string)"
			)
			attest(T.allows([["foo", 5]])).equals(false)
			attest(T([["foo", 5]]).toString()).snap(
				"value at [0][1] must be a string (was a number)"
			)
		})

		it("tuple expression", () => {
			const T = type(["string", "[]"])
			attest<string[]>(T.infer)
			attest(T.json).equals(type("string[]").json)
		})

		it("root expression", () => {
			const T = type("string", "[]")
			attest<string[]>(T.infer)
			attest(T.json).equals(type("string[]").json)
		})

		it("chained", () => {
			const T = type({ a: "string" }).array()
			attest<{ a: string }[]>(T.infer)
			attest(T.expression).snap("{ a: string }[]")
		})

		it("incomplete token", () => {
			// @ts-expect-error
			attest(() => type("string[")).throwsAndHasTypeError(
				incompleteArrayTokenMessage
			)
		})
	})

	describe("non-variadic tuple", () => {
		it("empty", () => {
			const T = type([])
			attest<[]>(T.infer)
			attest(T.expression).snap("[]")
			attest(T.json).snap({ proto: "Array", exactLength: 0 })
			attest(T([])).equals([])
			attest(T([1]).toString()).snap("must be exactly length 0 (was 1)")
		})

		it("shallow", () => {
			const T = type(["string", "number"])
			attest<[string, number]>(T.infer)
			attest(T.allows(["", 0])).equals(true)
			attest(T(["", 0])).snap(["", 0])
			attest(T.allows([true, 0])).equals(false)
			attest(T([true, 0]).toString()).snap(
				"value at [0] must be a string (was boolean)"
			)
			attest(T.allows([0, false])).equals(false)
			attest(T([0, false]).toString())
				.snap(`value at [0] must be a string (was a number)
value at [1] must be a number (was boolean)`)
			// too short
			attest(T.allows([""])).equals(false)
			attest(T([""]).toString()).snap("must be exactly length 2 (was 1)")
			// too long
			attest(T.allows(["", 0, 1])).equals(false)
			attest(T(["", 0, 1]).toString()).snap("must be exactly length 2 (was 3)")
			// non-array
			attest(
				T.allows({
					length: 2,
					0: "",
					1: 0
				})
			).equals(false)
			attest(
				T({
					length: 2,
					0: "",
					1: 0
				}).toString()
			).snap("must be an array (was object)")
		})

		it("nested", () => {
			const T = type([["string", "number"], [{ a: "bigint", b: ["null"] }]])
			attest<
				[
					[string, number],
					[
						{
							a: bigint
							b: [null]
						}
					]
				]
			>(T.infer)
			const valid: typeof T.infer = [["", 0], [{ a: 0n, b: [null] }]]
			attest(T.allows(valid)).equals(true)
			attest(T(valid)).equals(valid)
			const invalid = [["", 0], [{ a: 0n, b: [undefined] }]]
			attest(T.allows(invalid)).equals(false)
			attest(T(invalid).toString()).snap(
				"value at [1][0].b[0] must be null (was undefined)"
			)
		})

		it("optional tuple", () => {
			const T = type([["string", "?"]])
			attest<[string?]>(T.infer)
			attest(T([])).equals([])
			attest(T(["foo"])).equals(["foo"])
			attest(T([5]).toString()).snap(
				"value at [0] must be a string (was a number)"
			)
			attest(T(["foo", "bar"]).toString()).snap(
				"must be at most length 1 (was 2)"
			)
		})

		it("optional string-embedded tuple", () => {
			const T = type(["string?"])

			const Expected = type([["string", "?"]])
			attest<typeof Expected>(T)
			attest(T.expression).equals(Expected.expression)
		})

		it("optional object tuple", () => {
			const T = type([[{ foo: "string" }, "?"], "string?"])
			attest<
				[
					{
						foo: string
					}?,
					string?
				]
			>(T.t)
			attest(T.expression).snap("[{ foo: string }?, string?]")
		})

		it("optional nested object tuple", () => {
			const T = type([[[{ foo: "string" }, "?"]], ["string", "?"]])
			attest<
				[
					[
						{
							foo: string
						}?
					],
					string?
				]
			>(T.t)
			attest(T.expression).snap("[[{ foo: string }?], string?]")
		})
	})

	describe("variadic tuple", () => {
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
				type([
					"...",
					"string[]",
					// @ts-expect-error
					"...",
					"number[]"
				])
			).throwsAndHasTypeError(multipleVariadicMesage)
		})
	})

	it("reduces minLength", () => {
		const T = type(["number", "number", "...", "number[]", "number"])
		const Expected = type("number[]>=3")
		attest(T.json).equals(Expected.json)
	})

	it("multiple errors", () => {
		const StringArray = type("string[]")
		attest(StringArray([1, 2]).toString())
			.snap(`value at [0] must be a string (was a number)
value at [1] must be a string (was a number)`)
	})
})

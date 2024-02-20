import { attest } from "@arktype/attest"
import { scope, type } from "arktype"
import { writeUnresolvableMessage } from "../parser/string/shift/operand/unenclosed.js"
import { incompleteArrayTokenMessage } from "../parser/string/shift/operator/operator.js"
import {
	multipleVariadicMesage,
	writeNonArraySpreadMessage
} from "../parser/tuple.js"

describe("array", () => {
	describe("base", () => {
		it("allows and apply", () => {
			const t = type("string[]")
			attest<string[]>(t.infer)
			attest(t.allows([])).equals(true)
			attest(t([]).out).snap([])
			attest(t.allows(["foo", "bar"])).equals(true)
			attest(t(["foo", "bar"]).out).snap(["foo", "bar"])
			attest(t.allows(["foo", "bar", 5])).equals(false)
			attest(t(["foo", "bar", 5]).errors?.summary).snap(
				"Value at [2] must be a string (was number)"
			)
			attest(t.allows([5, "foo", "bar"])).equals(false)
			attest(t([5, "foo", "bar"]).errors?.summary).snap(
				"Value at [0] must be a string (was number)"
			)
		})

		it("nested", () => {
			const t = type("string[][]")
			attest<string[][]>(t.infer)
			attest(t.allows([])).equals(true)
			attest(t([]).out).snap([])
			attest(t.allows([["foo"]])).equals(true)
			attest(t([["foo"]]).out).snap([["foo"]])
			attest(t.allows(["foo"])).equals(false)
			attest(t(["foo"]).errors?.summary).snap(
				"Value at [0] must be an array (was string)"
			)
			attest(t.allows([["foo", 5]])).equals(false)
			attest(t([["foo", 5]]).errors?.summary).snap(
				"Value at [0][1] must be a string (was number)"
			)
		})

		it("tuple expression", () => {
			const t = type(["string", "[]"])
			attest<string[]>(t.infer)
			attest(t.json).equals(type("string[]").json)
		})

		describe("optional tuple literals", () => {
			it("string optional", () => {
				const t = type(["string?"])
				attest<[string?]>(t.infer)
				attest(t.json).equals(type(["string?"]).json)
			})
			it("optional tuple", () => {
				const t = type([["string", "?"]])
				attest<[string?]>(t.infer)
				attest(t.json).equals(type(["string?"]).json)
			})
			it("multi-optional tuple", () => {
				const t = type([["string?", "?"]])
				attest<[string?]>(t.infer)
				attest(t.json).equals(type(["string?"]).json)
			})
			it("nested optional tuple", () => {
				const t = type([["string?"], "string?"])
				attest<[[string?], string?]>(t.infer)
			})
			it("shallow optional string", () => {
				// @ts-expect-error
				attest(() => type("string?")).throwsAndHasTypeError(
					writeUnresolvableMessage("string?")
				)
			})
			it("shallow optional tuple", () => {
				// @ts-expect-error
				attest(() => type(["string", "?"])).throws(
					writeUnresolvableMessage("?")
				)
			})
		})
		it("root expression", () => {
			const t = type("string", "[]")
			attest<string[]>(t.infer)
			attest(t.json).equals(type("string[]").json)
		})

		it("chained", () => {
			const t = type({ a: "string" }).array()
			attest<{ a: string }[]>(t.infer)

			// @ts-expect-error
			attest(() => type({ a: "hmm" }).array()).throwsAndHasTypeError(
				writeUnresolvableMessage("hmm")
			)
		})
		it("incomplete token", () => {
			// @ts-expect-error
			attest(() => type("string[")).throwsAndHasTypeError(
				incompleteArrayTokenMessage
			)
		})
	})
	describe("non-variadic tuple", () => {
		it("shallow", () => {
			const t = type(["string", "number"])
			attest<[string, number]>(t.infer)
			attest(t.allows(["", 0])).equals(true)
			attest(t(["", 0]).out).snap(["", 0])
			attest(t.allows([true, 0])).equals(false)
			attest(t([true, 0]).errors?.summary).snap(
				"Value at [0] must be a string (was boolean)"
			)
			attest(t.allows([0, false])).equals(false)
			attest(t([0, false]).errors?.summary)
				.snap(`Value at [0] must be a string (was number)
Value at [1] must be a number (was boolean)`)
			// too short
			attest(t.allows([""])).equals(false)
			attest(t([""]).errors?.summary).snap("Must be at least length 2 (was 1)")
			// too long
			attest(t.allows(["", 0, 1])).equals(false)
			attest(t(["", 0, 1]).errors?.summary).snap(
				"Must be at most length 2 (was 3)"
			)
			// non-array
			attest(
				t.allows({
					length: 2,
					0: "",
					1: 0
				})
			).equals(false)
			attest(
				t({
					length: 2,
					0: "",
					1: 0
				}).errors?.summary
			).snap("Must be an array (was object)")
		})

		it("nested", () => {
			const t = type([["string", "number"], [{ a: "bigint", b: ["null"] }]])
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
			>(t.infer)
			const valid: typeof t.infer = [["", 0], [{ a: 0n, b: [null] }]]
			attest(t.allows(valid)).equals(true)
			attest(t(valid).out).equals(valid)
			const invalid = [["", 0], [{ a: 0n, b: [undefined] }]]
			attest(t.allows(invalid)).equals(false)
			attest(t(invalid).errors?.summary).snap(
				"Value at [1][0].b[0] must be null (was undefined)"
			)
		})
	})
	describe("variadic tuple", () => {
		it("spreads simple arrays", () => {
			const wellRested = type(["string", "...number[]"])
			attest<[string, ...number[]]>(wellRested.infer)
			attest(wellRested(["foo"]).out).equals(["foo"])
			attest(wellRested(["foo", 1, 2]).out).equals(["foo", 1, 2])
		})
		it("tuple expression", () => {
			const wellRestedTuple = type(["number", ["...", [{ a: "string" }, "[]"]]])
			attest<[number, ...{ a: string }[]]>(wellRestedTuple.infer)
		})
		it("spreads array expressions", () => {
			const greatSpread = type(["0", "...(Date|RegExp)[]"])
			attest<[0, ...(RegExp | Date)[]]>(greatSpread.infer)
		})
		it("distributes spread unions", () => {
			const t = type(["1", "...(Date[] | RegExp[])"])
			attest<[1, ...(Date[] | RegExp[])]>(t.infer)
			const expected = type(["1", "...Date[]"]).or(["1", "...RegExp[]"])
			attest(t.json).equals(expected.json)
		})
		it("allows array keyword", () => {
			const types = scope({
				myArrayKeyword: "boolean[]",
				myVariadicKeyword: ["string", "...myArrayKeyword"]
			}).export()
			attest<[string, ...boolean[]]>(types.myVariadicKeyword.infer)
		})
		it("errors on non-array", () => {
			attest(() =>
				// @ts-expect-error
				type(["email", "...symbol"])
			).throwsAndHasTypeError(writeNonArraySpreadMessage("symbol"))
			attest(() =>
				// @ts-expect-error
				type(["number", ["...", "string"]])
			).throwsAndHasTypeError(writeNonArraySpreadMessage("string"))
		})
		it("errors on non-last element", () => {
			attest(() =>
				// @ts-expect-error
				type(["...number[]", "string"])
			).throwsAndHasTypeError(multipleVariadicMesage)
			attest(() =>
				// @ts-expect-error
				type([["...", "string[]"], "number"])
			).throwsAndHasTypeError(multipleVariadicMesage)
		})
	})
	describe("intersection", () => {
		it("shallow array intersection", () => {
			const t = type("string[]&'foo'[]")
			const expected = type("'foo'[]")
			attest(t.json).equals(expected.json)
		})
		it("deep array intersection", () => {
			const t = type([{ a: "string" }, "[]"]).and([{ b: "number" }, "[]"])
			const expected = type([{ a: "string", b: "number" }, "[]"])
			attest(t.json).equals(expected.json)
		})
		it("tuple intersection", () => {
			const t = type([[{ a: "string" }], "&", [{ b: "boolean" }]])
			attest<
				[
					{
						a: string
						b: boolean
					}
				]
			>(t.infer)
			const expected = type([{ a: "string", b: "boolean" }])
		})
		it("tuple and array", () => {
			const tupleAndArray = type([
				[{ a: "string" }],
				"&",
				[{ b: "boolean" }, "[]"]
			])
			const arrayAndTuple = type([
				[{ b: "boolean" }, "[]"],
				"&",
				[{ a: "string" }]
			])
			attest<
				[
					{
						a: string
						b: boolean
					}
				]
			>(tupleAndArray.infer)

			attest<
				[
					{
						a: string
						b: boolean
					}
				]
			>(arrayAndTuple.infer)

			const expected = type([{ a: "string", b: "boolean" }])
			attest(tupleAndArray.json).equals(expected.json)
			attest(arrayAndTuple.json).equals(expected.json)
		})
		it("variadic and tuple", () => {
			const b = type([{ b: "boolean" }, "[]"])
			const t = type([{ a: "string" }, ["...", b]]).and([
				{ c: "number" },
				{ d: "Date" }
			])
			const expected = type([
				{ a: "string", c: "number" },
				{ b: "boolean", d: "Date" }
			])
			attest(t.json).equals(expected.json)
		})
		it("variadic and array", () => {
			const b = type({ b: "boolean" }, "[]")
			const t = type([{ a: "string" }, ["...", b]]).and([{ c: "number" }, "[]"])
			const expected = type([
				{ a: "string", c: "number" },
				["...", [{ b: "boolean", c: "number" }, "[]"]]
			])
			attest<typeof expected.infer>(t.infer)
			attest(t.json).equals(expected.json)
		})
		// based on the equivalent type-level test from @arktype/util
		it("kitchen sink", () => {
			const l = type([
				{ a: "0" },
				[{ b: "1" }, "?"],
				[{ c: "2" }, "?"],
				["...", [{ d: "3" }, "[]"]]
			])
			const r = type([
				[{ e: "4" }, "?"],
				[{ f: "5" }, "?"],
				["...", [{ g: "6" }, "[]"]]
			])
			const result = l.and(r)

			const expected = type([
				{ a: "0", e: "4" },
				[{ b: "1", f: "5" }, "?"],
				[{ c: "2", g: "6" }, "?"],
				["...", [{ d: "3", g: "6" }, "[]"]]
			])

			attest<typeof expected>(result)
			attest(result.json).equals(expected.json)
		})
		it("prefix and postfix", () => {
			const l = type([["...", [{ a: "0" }, "[]"]], { b: "0" }, { c: "0" }])
			const r = type([
				{ x: "0" },
				[{ y: "0" }, "?"],
				["...", [{ z: "0" }, "[]"]]
			])

			// [ax, ay, ...az[], bz, cz]
			// [ax, by, cz]
			// [bx, cy]
			const result = l.and(r)
			attest(result.json)
		})
	})
	// TODO: reenable
	// describe("traversal", () => {
	//     it("multiple errors", () => {
	//         const stringArray = type("string[]")
	//         attest(stringArray([1, 2]).errors?.summary).snap(
	//             "Item at index 0 must be a string (was number)\nItem at index 1 must be a string (was number)"
	//         )
	//     })
	// })
})

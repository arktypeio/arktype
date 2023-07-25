import { attest } from "@arktype/test"
import { scope, type } from "../type/main.js"
import { suite, test } from "mocha"
import { writeUnresolvableMessage } from "../type/parser/string/shift/operand/unenclosed.js"
import { incompleteArrayTokenMessage } from "../type/parser/string/shift/operator/operator.js"
import {
	prematureRestMessage,
	writeNonArrayRestMessage
} from "../type/parser/tuple.js"

suite("array", () => {
	suite("base", () => {
		test("base", () => {
			const t = type("string[]")
			attest(t.infer).typed as string[]
			attest(t.allows([])).equals(true)
			attest(t.allows(["foo", "bar"])).equals(true)
			attest(t.allows(["foo", "bar", 5])).equals(false)
			attest(t.allows([5, "foo", "bar"])).equals(false)
		})
		test("nested", () => {
			const t = type("string[][]")
			attest(t.infer).typed as string[][]
			attest(t.allows([])).equals(true)
			attest(t.allows([["foo"]])).equals(true)
			attest(t.allows(["foo"])).equals(false)
			attest(t.allows([["foo", 5]])).equals(false)
		})

		test("tuple expression", () => {
			const t = type(["string", "[]"])
			attest(t.infer).typed as string[]
			attest(t.condition).equals(type("string[]").condition)
		})
		suite("optional tuple literals", () => {
			test("string optional", () => {
				const t = type(["string?"])
				attest(t.infer).typed as [string?]
				attest(t.condition).equals(type(["string?"]).condition)
			})
			test("optional tuple", () => {
				const t = type([["string", "?"]])
				attest(t.infer).typed as [string?]
				attest(t.condition).equals(type(["string?"]).condition)
			})
			test("multi-optional tuple", () => {
				const t = type([["string?", "?"]])
				attest(t.infer).typed as [string?]
				attest(t.condition).equals(type(["string?"]).condition)
			})
			test("nested optional tuple", () => {
				const t = type([["string?"], "string?"])
				attest(t.infer).typed as [[string?], string?]
			})
			suite("error optionals", () => {
				test("shallow optional", () => {
					const t = type("string?")
				})
				test("shallow optional in tuple form", () => {
					const t = type(["string", "?"])
				})
			})
		})
		test("root expression", () => {
			const t = type("string", "[]")
			attest(t.infer).typed as string[]
			attest(t.condition).equals(type("string[]").condition)
		})

		test("chained", () => {
			const t = type({ a: "string" }).array()
			attest(t.infer).typed as {
				a: string
			}[]
			// @ts-expect-error
			attest(() => type({ a: "hmm" }).array()).throwsAndHasTypeError(
				writeUnresolvableMessage("hmm")
			)
		})
		test("incomplete token", () => {
			// @ts-expect-error
			attest(() => type("string[")).throwsAndHasTypeError(
				incompleteArrayTokenMessage
			)
		})
	})
	suite("non-variadic tuple", () => {
		test("shallow", () => {
			const t = type(["string", "number"])
			attest(t.infer).typed as [string, number]
			attest(t.allows(["", 0])).equals(true)
			attest(t.allows([true, 0])).equals(false)
			attest(t.allows([0, false])).equals(false)
			// too short
			attest(t.allows([""])).equals(false)
			// too long
			attest(t.allows(["", 0, 1])).equals(false)
			// non-array
			attest(
				t.allows({
					length: 2,
					0: "",
					1: 0
				})
			).equals(false)
		})
		test("nested", () => {
			const t = type([["string", "number"], [{ a: "boolean", b: ["null"] }]])
			attest(t.infer).typed as [
				[string, number],
				[
					{
						a: boolean
						b: [null]
					}
				]
			]
			attest(t.allows([["", 0], [{ a: true, b: [null] }]])).equals(true)
			attest(t.allows([["", 0], [{ a: true, b: [undefined] }]])).equals(false)
		})
	})
	suite("variadic tuple", () => {
		suite("variadic", () => {
			test("spreads simple arrays", () => {
				const wellRested = type(["string", "...number[]"])
				attest(wellRested.infer).typed as [string, ...number[]]
				attest(wellRested(["foo"]).data).equals(["foo"])
				attest(wellRested(["foo", 1, 2]).data).equals(["foo", 1, 2])
			})
			test("tuple expression", () => {
				const wellRestedTuple = type([
					"number",
					["...", [{ a: "string" }, "[]"]]
				])
				attest(wellRestedTuple.infer).typed as [number, ...{ a: string }[]]
			})
			test("spreads array expressions", () => {
				const greatSpread = type([{ a: "boolean" }, "...(Date|RegExp)[]"])
				attest(greatSpread.infer).typed as [
					{
						a: boolean
					},
					...(RegExp | Date)[]
				]
			})
			test("allows array keyword", () => {
				const types = scope({
					myArrayKeyword: "boolean[]",
					myVariadicKeyword: ["string", "...myArrayKeyword"]
				}).export()
				attest(types.myVariadicKeyword.infer).typed as [string, ...boolean[]]
			})
			test("errors on non-array", () => {
				attest(() =>
					// @ts-expect-error
					type(["email", "...symbol"])
				).throwsAndHasTypeError(writeNonArrayRestMessage("symbol"))
				attest(() =>
					// @ts-expect-error
					type(["number", ["...", "string"]])
				).throwsAndHasTypeError(writeNonArrayRestMessage("string"))
			})
			test("errors on non-last element", () => {
				attest(() =>
					// @ts-expect-error
					type(["...number[]", "string"])
				).throwsAndHasTypeError(prematureRestMessage)
				attest(() =>
					// @ts-expect-error
					type([["...", "string[]"], "number"])
				).throwsAndHasTypeError(prematureRestMessage)
			})
		})
	})
	suite("intersection", () => {
		test("shallow array intersection", () => {
			const actual = type("string[]&'foo'[]").condition
			const expected = type("'foo'[]").condition
			attest(actual).is(expected)
		})
		test("deep array intersection", () => {
			const actual = type([{ a: "string" }, "[]"]).and([
				{ b: "number" },
				"[]"
			]).condition
			const expected = type([{ a: "string", b: "number" }, "[]"]).condition
			attest(actual).is(expected)
		})
		test("tuple intersection", () => {
			const t = type([[{ a: "string" }], "&", [{ b: "boolean" }]])
			attest(t.infer).typed as [
				{
					a: string
					b: boolean
				}
			]
		})
		test("tuple and array", () => {
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
			attest(tupleAndArray.infer).typed as [
				{
					a: string
					b: boolean
				}
			]
			attest(arrayAndTuple.infer).typed as [
				{
					a: string
					b: boolean
				}
			]
			const expected = type([{ a: "string", b: "boolean" }]).condition
			attest(tupleAndArray.condition).is(expected)
			attest(arrayAndTuple.condition).is(expected)
		})
		test("variadic and tuple", () => {
			const b = type([{ b: "boolean" }, "[]"])
			const t = type([{ a: "string" }, ["...", b]]).and([
				{ c: "number" },
				{ d: "Date" }
			])
			const expected = type([
				{ a: "string", c: "number" },
				{ b: "boolean", d: "Date" }
			])
			attest(t.condition).typedValue(expected.condition)
		})
		test("variadic and array", () => {
			const b = type({ b: "boolean" }, "[]")
			// TODO: possible to allow top-level tuple?
			const t = type([{ a: "string" }, ["...", b]]).and([{ c: "number" }, "[]"])
			const expected = type([
				{ a: "string", b: "boolean" },
				["...", [{ a: "string", c: "number" }, "[]"]]
			])
			attest(t.infer).typed as [
				{
					a: string
					b: boolean
				},
				...{
					a: string
					c: number
				}[]
			]
			attest(t.infer).typed as typeof expected.infer
			attest(t.condition).equals(expected.condition)
		})
	})
	// TODO: reenable
	// suite("traversal", () => {
	//     test("multiple errors", () => {
	//         const stringArray = type("string[]")
	//         attest(stringArray([1, 2]).problems?.summary).snap(
	//             "Item at index 0 must be a string (was number)\nItem at index 1 must be a string (was number)"
	//         )
	//     })
	// })
})

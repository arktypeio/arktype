import { attest, contextualize } from "@arktype/attest"
import {
	keywordNodes,
	writeIndivisibleMessage,
	writeUnresolvableMessage
} from "@arktype/schema"
import { scope, type } from "arktype"
import { emptyGenericParameterMessage } from "../generic.js"
import { writeUnclosedGroupMessage } from "../parser/string/reduce/shared.js"
import { writeInvalidGenericArgsMessage } from "../parser/string/shift/operand/genericArgs.js"
import { writeInvalidDivisorMessage } from "../parser/string/shift/operator/divisor.js"
import { writeUnexpectedCharacterMessage } from "../parser/string/shift/operator/operator.js"

contextualize(() => {
	describe("standalone", () => {
		it("unary", () => {
			const boxOf = type("<t>", { box: "t" })

			const schrodingersBox = boxOf({ cat: { isAlive: "boolean" } })

			const expected = type({
				box: {
					cat: { isAlive: "boolean" }
				}
			})

			attest<typeof expected.t>(schrodingersBox.t)
			attest(schrodingersBox.json).equals(expected.json)
		})

		it("binary", () => {
			const either = type("<first, second>", "first|second")
			const schrodingersBox = either(
				{ cat: { isAlive: "true" } },
				{ cat: { isAlive: "false" } }
			)

			const expected = type(
				{
					cat: {
						isAlive: "true"
					}
				},
				"|",
				{
					cat: {
						isAlive: "false"
					}
				}
			)

			attest<typeof expected.t>(schrodingersBox.t)
			// ideally, this would be reduced to { cat: { isAlive: boolean } }:
			// https://github.com/arktypeio/arktype/issues/751
			attest(schrodingersBox.json).equals(expected.json)
		})

		it("with constraint", () => {
			const nonEmpty = type("<arr extends Array>", "arr > 0")
		})

		it("referenced in scope inline", () => {
			const $ = scope({
				one: "1",
				orOne: () => $.type("<t>", "t|one")
			})

			const types = $.export()
			const bit = types.orOne("0")

			const expected = type("0|1")

			attest<typeof expected.t>(bit.t)
			attest(bit.json).equals(expected.json)
		})

		it("referenced from other scope", () => {
			const types = scope({
				arrayOf: type("<t>", "t[]")
			}).export()

			const stringArray = types.arrayOf("string")
			const expected = type("string[]")

			attest<typeof expected.t>(stringArray.t)
			attest(stringArray.json).equals(expected.json)
		})

		it("this not resolvable in generic def", () => {
			attest(() =>
				// @ts-expect-error
				type("<t>", {
					box: "t | this"
				})
			).throwsAndHasTypeError(writeUnresolvableMessage("this"))
		})

		it("this in arg", () => {
			const boxOf = type("<t>", {
				box: "t"
			})
			const t = boxOf({
				a: "string|this"
			})

			const expectedContents = type({ a: "string|this" })
			const expectedBox = type({ box: expectedContents })

			attest(t.t).type.toString.snap("{ box: { a: string | ...; }; }")
			attest(t.json).equals(expectedBox.json)
		})

		it("too few args", () => {
			const pair = type("<t, u>", ["t", "u"])
			// @ts-expect-error
			attest(() => pair("string")).type.errors(
				"Expected 2 arguments, but got 1"
			)
		})

		it("too many args", () => {
			const pair = type("<t, u>", ["t", "u"])
			// @ts-expect-error
			attest(() => pair("string", "boolean", "number")).type.errors(
				"Expected 2 arguments, but got 3"
			)
		})
	})

	contextualize.each(
		"scoped",
		() => {
			const $ = scope({
				"box<t,u>": {
					box: "t|u"
				},
				bitBox: "box<0,1>"
			})

			return { $, types: $.export() }
		},
		it => {
			it("referenced in scope", ({ types }) => {
				const expected = type({ box: "0|1" })

				attest(types.bitBox.json).equals(expected.json)
				attest<typeof expected.t>(types.bitBox.t)
			})

			it("nested", ({ $ }) => {
				const t = $.type("box<0|1, box<'one', 'zero'>>")

				const expected = type({ box: ["0|1", "|", { box: "'one'|'zero'" }] })

				attest<typeof expected.t>(t.t)
				attest(t.json).equals(expected.json)
			})

			it("in expression", ({ $ }) => {
				const t = $.type("string | box<0, 1> | boolean")

				const expected = type("string|boolean", "|", { box: "0|1" })

				attest<typeof expected.t>(t.t)
				attest(t.json).equals(expected.json)
			})

			it("this in args", ({ $ }) => {
				const t = $.type("box<0,  this>")
				type Expected = {
					box: 0 | Expected
				}
				const standalone = type({
					box: "0|this"
				})

				attest<Expected>(t.t)
				attest<Expected>(standalone.t)
				attest(t.json).equals(standalone.json)
			})

			it("right bounds", ({ $ }) => {
				// should be able to differentiate between > that is part of a right
				// bound and > that closes a generic instantiation
				const t = $.type("box<number>5, string>=7>")

				const expected = type({
					box: "number>5|string>=7"
				})

				attest<typeof expected.t>(t.t)
				attest(t.json).equals(expected.json)
			})

			it("unclosed instantiation", ({ $ }) => {
				// @ts-expect-error
				attest(() => $.type("box<0,  1")).throwsAndHasTypeError(
					writeUnclosedGroupMessage(">")
				)
			})

			it("extra >", ({ $ }) => {
				attest(() =>
					// @ts-expect-error
					$.type("box<0,  this>>")
				).throwsAndHasTypeError(writeUnexpectedCharacterMessage(">"))
			})

			it("too few args", ({ $ }) => {
				attest(() =>
					// @ts-expect-error
					$.type("box<0,box<2 | 3>>")
				).throwsAndHasTypeError(
					writeInvalidGenericArgsMessage("box", ["t", "u"], ["2 | 3"])
				)
			})

			it("too many args", ({ $ }) => {
				attest(() =>
					// @ts-expect-error
					$.type("box<0, box<1, 2, 3>>")
				).throwsAndHasTypeError(
					writeInvalidGenericArgsMessage("box", ["t", "u"], ["1", "2", "3"])
				)
			})

			it("syntactic error in arg", ({ $ }) => {
				attest(() =>
					// @ts-expect-error
					$.type("box<1, number%0>")
				).throwsAndHasTypeError(writeInvalidDivisorMessage(0))
			})

			it("semantic error in arg", ({ $ }) => {
				attest(() =>
					// @ts-expect-error
					$.type("box<1,string%2>")
				).throwsAndHasTypeError(writeIndivisibleMessage(keywordNodes.string))
			})

			it("parameter supercedes alias with same name", () => {
				const types = scope({
					"box<foo>": {
						box: "foo|bar"
					},
					foo: "'foo'",
					bar: "'bar'"
				}).export()

				const t = types.box("'baz'")

				const expected = type({ box: "'bar' | 'baz'" })

				attest<typeof expected.t>(t.t)
				attest(t.json).equals(expected.json)
			})

			// it("self-reference", () => {
			// 	const types = scope({
			// 		"alternate<a, b>": {
			// 			// ensures old generic params aren't intersected with
			// 			// updated values (would be never)
			// 			swap: "alternate<b, a>",
			// 			order: ["a", "b"]
			// 		},
			// 		reference: "alternate<0, 1>"
			// 	}).export()

			// 	attest<[0, 1]>(types.reference.infer.swap.swap.order)
			// 	attest<[1, 0]>(types.reference.infer.swap.swap.swap.order)
			// 	const fromCall = types.alternate("'off'", "'on'")
			// 	attest<["off", "on"]>(fromCall.infer.swap.swap.order)
			// 	attest<["on", "off"]>(fromCall.infer.swap.swap.swap.order)
			// })

			// it("self-reference no params", () => {
			// 	attest(() =>
			// 		scope({
			// 			"nest<t>": {
			// 				// @ts-expect-error
			// 				nest: "nest"
			// 			}
			// 		}).export()
			// 	).throwsAndHasTypeError(
			// 		writeInvalidGenericArgsMessage("nest", ["t"], [])
			// 	)
			// })

			it("declaration and instantiation leading and trailing whitespace", () => {
				const types = scope({
					"box< a , b >": {
						box: " a | b "
					},
					actual: "  box  < 'foo'  ,   'bar'  > "
				}).export()

				const expected = type({
					box: "'foo' | 'bar'"
				})

				attest<typeof expected.t>(types.actual.t)
			})

			it("allows external scope reference to be resolved", () => {
				const types = scope({
					external: "'external'",
					"orExternal<t>": "t|external"
				}).export()

				const b = scope({
					orExternal: types.orExternal,
					internal: "orExternal<'internal'>"
				}).export()

				const expected = type("'internal' | 'external'")

				attest<typeof expected.t>(b.internal.t)
				attest(b.internal.json).equals(expected.json)
			})

			it("empty string in declaration", () => {
				attest(() =>
					scope({
						// @ts-expect-error
						"box<t,,u>": "string"
					})
				).throwsAndHasTypeError(emptyGenericParameterMessage)
			})
		}
	)
})

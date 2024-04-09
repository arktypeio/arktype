import { attest } from "@arktype/attest"
import {
	keywordNodes,
	writeIndivisibleMessage,
	writeUnresolvableMessage
} from "@arktype/schema"
import { lazily } from "@arktype/util"
import { ark, scope, type } from "arktype"
import { emptyGenericParameterMessage } from "../parser/generic.js"
import { writeUnclosedGroupMessage } from "../parser/string/reduce/shared.js"
import { writeInvalidGenericArgsMessage } from "../parser/string/shift/operand/genericArgs.js"
import { writeInvalidDivisorMessage } from "../parser/string/shift/operator/divisor.js"
import { writeUnexpectedCharacterMessage } from "../parser/string/shift/operator/operator.js"

describe("generics", () => {
	describe("standalone generic", () => {
		it("unary", () => {
			const boxOf = type("<t>", { box: "t" })
			const schrodingersBox = boxOf({ cat: { isAlive: "boolean" } })
			attest<{ box: { cat: { isAlive: boolean } } }>(
				schrodingersBox.infer
			)

			attest(schrodingersBox.json).equals(
				type({
					box: {
						cat: { isAlive: "boolean" }
					}
				}).json
			)
		})
		it("binary", () => {
			const either = type("<first, second>", "first|second")
			const schrodingersBox = either(
				{ cat: { isAlive: "true" } },
				{ cat: { isAlive: "false" } }
			)
			attest<
				| {
						cat: {
							isAlive: true
						}
				  }
				| {
						cat: {
							isAlive: false
						}
				  }
			>(schrodingersBox.infer)

			// ideally, this would be reduced to { cat: { isAlive: boolean } }:
			// https://github.com/arktypeio/arktype/issues/751
			attest(schrodingersBox.json).equals(
				type(
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
				).json
			)
		})
		// TODO: currently crashes TS compiler
		// it("referenced in scope inline", () => {
		// 	const $ = scope({
		// 		one: "1",
		// 		orOne: () => $.type("<t>", "t|one")
		// 	})
		// 	const types = $.export()
		// 	const bit = types.orOne("0")
		// 	attest<0 | 1>(bit.infer)
		// 	attest(bit.json).equals(type("0|1").json)
		// })
		it("referenced from other scope", () => {
			const types = scope({
				arrayOf: type("<t>", "t[]")
			}).export()
			const stringArray = types.arrayOf("string")
			attest<string[]>(stringArray.infer)
			attest(stringArray.json).equals(type("string[]").json)
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
			attest(t.json).equals(type({ box: expectedContents }).json)
			attest(t.infer).type.toString.snap("{ box: { a: string | any; }; }")
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

	describe("in-scope", () => {
		const $ = lazily(() =>
			scope({
				"box<t,u>": {
					box: "t|u"
				},
				bitBox: "box<0,1>"
			})
		)
		const types = lazily(() => $.export())
		it("referenced in scope", () => {
			attest(types.bitBox.json).equals(type({ box: "0|1" }).json)
			attest<{ box: 0 | 1 }>(types.bitBox.infer)
		})
		it("nested", () => {
			const t = $.type("box<0|1, box<'one', 'zero'>>")
			attest(t.json).equals(
				type({ box: ["0|1", "|", { box: "'one'|'zero'" }] }).json
			)
			attest<{
				box:
					| 0
					| 1
					| {
							box: "one" | "zero"
					  }
			}>(t.infer)
		})
		it("in expression", () => {
			const t = $.type("string | box<0, 1> | boolean")
			attest(t.json).equals(
				// as const is required for TS <=5.0
				type("string|boolean", "|", { box: "0|1" }).json
			)
			attest<string | { box: 0 | 1 } | boolean>(t.infer)
		})
		it("this in args", () => {
			const t = $.type("box<0,  this>")
			type Expected = {
				box: 0 | Expected
			}
			attest(t.json).equals(
				type({
					box: "0|this"
				}).json
			)
			attest<Expected>(t.infer)
		})
		it("right bounds", () => {
			// should be able to differentiate between > that is part of a right
			// bound and > that closes a generic instantiation
			const t = $.type("box<number>5, string>=7>")
			attest<{ box: string | number }>(t.infer)
			attest(t.json).equals(
				type({
					box: "number>5|string>=7"
				}).json
			)
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
			attest<{ box: "bar" | "baz" }>(t.infer)
			attest(t.json).equals(type({ box: "'bar' | 'baz'" }).json)
		})
		it("self-reference", () => {
			const types = scope({
				"alternate<a, b>": {
					// ensures old generic params aren't intersected with
					// updated values (would be never)
					swap: "alternate<b, a>",
					order: ["a", "b"]
				},
				reference: "alternate<0, 1>"
			}).export()
			attest<[0, 1]>(types.reference.infer.swap.swap.order)
			attest<[1, 0]>(types.reference.infer.swap.swap.swap.order)
			const fromCall = types.alternate("'off'", "'on'")
			attest<["off", "on"]>(fromCall.infer.swap.swap.order)
			attest<["on", "off"]>(fromCall.infer.swap.swap.swap.order)
		})
		it("self-reference no params", () => {
			const z = scope({
				"nest<t>": {
					// @ts-expect-error
					nest: "nest"
				}
			}).export()
			attest(() =>
				scope({
					"nest<t>": {
						// @ts-expect-error
						nest: "nest"
					}
				}).export()
			).throwsAndHasTypeError(
				writeInvalidGenericArgsMessage("nest", ["t"], [])
			)
		})
		it("declaration and instantiation leading and trailing whitespace", () => {
			const types = scope({
				"box< a , b >": {
					box: " a | b "
				},
				actual: "  box  < 'foo'  ,   'bar'  > "
			}).export()
			attest<{ box: "foo" | "bar" }>(types.actual.infer)
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
			attest<"internal" | "external">(b.internal.infer)
		})
		describe("parse errors", () => {
			it("empty string in declaration", () => {
				attest(() =>
					scope({
						// @ts-expect-error
						"box<t,,u>": "string"
					})
				).throwsAndHasTypeError(emptyGenericParameterMessage)
			})
			it("unclosed instantiation", () => {
				// @ts-expect-error
				attest(() => $.type("box<0,  1")).throwsAndHasTypeError(
					writeUnclosedGroupMessage(">")
				)
			})
			it("extra >", () => {
				attest(() =>
					// @ts-expect-error
					$.type("box<0,  this>>")
				).throwsAndHasTypeError(writeUnexpectedCharacterMessage(">"))
			})
			it("too few args", () => {
				attest(() =>
					// @ts-expect-error
					$.type("box<0,box<2|3>>")
				).throwsAndHasTypeError(
					writeInvalidGenericArgsMessage("box", ["t", "u"], ["2|3"])
				)
			})
			it("too many args", () => {
				attest(() =>
					// @ts-expect-error
					$.type("box<0, box<1, 2, 3>>")
				).throwsAndHasTypeError(
					writeInvalidGenericArgsMessage(
						"box",
						["t", "u"],
						["1", " 2", " 3"]
					)
				)
			})
			it("syntactic error in arg", () => {
				attest(() =>
					// @ts-expect-error
					$.type("box<1, number%0>")
				).throwsAndHasTypeError(writeInvalidDivisorMessage(0))
			})
			it("semantic error in arg", () => {
				attest(() =>
					// @ts-expect-error
					$.type("box<1,string%2>")
				).throwsAndHasTypeError(
					writeIndivisibleMessage(keywordNodes.string)
				)
			})
		})
	})
	describe("builtins", () => {
		it("record", () => {
			const t = ark.Record("string", "number")
			attest(t.json).equals(type("Record<string, number>").json)
		})
	})
})

import { attest } from "@arktype/attest"
import { writeIndivisibleMessage } from "@arktype/schema"
import { lazily } from "@arktype/util"
import { scope, type } from "arktype"
import { suite, test } from "mocha"
import {
	emptyGenericParameterMessage,
	writeInvalidGenericArgsMessage
} from "../parser/generic.js"
import { writeUnclosedGroupMessage } from "../parser/string/reduce/shared.js"
import { writeUnresolvableMessage } from "../parser/string/shift/operand/unenclosed.js"
import { writeInvalidDivisorMessage } from "../parser/string/shift/operator/divisor.js"
import { writeUnexpectedCharacterMessage } from "../parser/string/shift/operator/operator.js"

suite("generics", () => {
	suite("standalone generic", () => {
		test("unary", () => {
			const boxOf = type("<t>", { box: "t" })
			const schrodingersBox = boxOf({ cat: { isAlive: "boolean" } })
			attest<{ box: { cat: { isAlive: boolean } } }>(schrodingersBox.infer)

			attest(schrodingersBox.condition).equals(
				type({
					box: {
						cat: { isAlive: "boolean" }
					}
				}).condition
			)
		})
		test("binary", () => {
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
			attest(schrodingersBox.condition).equals(
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
				).condition
			)
		})
		test("referenced in scope inline", () => {
			const $ = scope({
				one: "1",
				orOne: () => $.type("<t>", "t|one")
			})
			const types = $.export()
			const bit = types.orOne("0")
			attest<0 | 1>(bit.infer)
			attest(bit.condition).equals(type("0|1").condition)
		})
		test("referenced from other scope", () => {
			const types = scope({
				arrayOf: type("<t>", "t[]")
			}).export()
			const stringArray = types.arrayOf("string")
			attest<string[]>(stringArray.infer)
			attest(stringArray.condition).equals(type("string[]").condition)
		})
		test("this not resolvable in generic def", () => {
			attest(() =>
				// @ts-expect-error
				type("<t>", {
					box: "t | this"
				})
			).throwsAndHasTypeError(writeUnresolvableMessage("this"))
		})
		test("this in arg", () => {
			const boxOf = type("<t>", {
				box: "t"
			})
			const t = boxOf({
				a: "string|this"
			})
			const expectedContents = type({ a: "string|this" })
			attest(t.condition).equals(type({ box: expectedContents }).condition)
			attest(t.infer).type.toString.snap("{ box: { a: string | any; }; }")
		})
		test("too few args", () => {
			const pair = type("<t, u>", ["t", "u"])
			// @ts-expect-error
			attest(() => pair("string")).type.errors(
				"Expected 2 arguments, but got 1"
			)
		})
		test("too many args", () => {
			const pair = type("<t, u>", ["t", "u"])
			// @ts-expect-error
			attest(() => pair("string", "boolean", "number")).type.errors(
				"Expected 2 arguments, but got 3"
			)
		})
	})

	suite("in-scope", () => {
		const $ = lazily(() =>
			scope({
				"box<t,u>": {
					box: "t|u"
				},
				bitBox: "box<0,1>"
			})
		)
		const types = lazily(() => $.export())
		test("referenced in scope", () => {
			attest(types.bitBox.condition).equals(type({ box: "0|1" }).condition)
			attest<{ box: 0 | 1 }>(types.bitBox.infer)
		})
		test("nested", () => {
			const t = $.type("box<0|1, box<'one', 'zero'>>")
			attest(t.condition).equals(
				type({ box: ["0|1", "|", { box: "'one'|'zero'" }] }).condition
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
		test("in expression", () => {
			const t = $.type("string | box<0, 1> | boolean")
			attest(t.condition).equals(
				// as const is required for TS <=5.0
				type("string|boolean", "|", { box: "0|1" } as const).condition
			)
			attest<string | { box: 0 | 1 } | boolean>(t.infer)
		})
		test("this in args", () => {
			const t = $.type("box<0,  this>")
			type Expected = {
				box: 0 | Expected
			}
			attest(t.condition).equals(
				type({
					box: "0|this"
				}).condition
			)
			attest<Expected>(t.infer)
		})
		test("right bounds", () => {
			// should be able to differentiate between > that is part of a right
			// bound and > that closes a generic instantiation
			const t = $.type("box<number>5, string>=7>")
			attest<{ box: string | number }>(t.infer)
			attest(t.condition).equals(
				type({
					box: "number>5|string>=7"
				}).condition
			)
		})
		test("parameter supercedes alias with same name", () => {
			const types = scope({
				"box<foo>": {
					box: "foo|bar"
				},
				foo: "'foo'",
				bar: "'bar'"
			}).export()
			const t = types.box("'baz'")
			attest<{ box: "bar" | "baz" }>(t.infer)
			attest(t.condition).equals(type({ box: "'bar' | 'baz'" }).condition)
		})
		test("self-reference", () => {
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
		test("self-reference no params", () => {
			attest(() =>
				scope({
					"nest<t>": {
						// @ts-expect-error
						nest: "nest"
					}
				}).export()
			).throwsAndHasTypeError(writeInvalidGenericArgsMessage("nest", ["t"], []))
		})
		test("declaration and instantiation leading and trailing whitespace", () => {
			const types = scope({
				"box< a , b >": {
					box: " a | b "
				},
				actual: "  box  < 'foo'  ,   'bar'  > "
			}).export()
			attest<{ box: "foo" | "bar" }>(types.actual.infer)
		})

		test("allows external scope reference to be resolved", () => {
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

		suite("parse errors", () => {
			test("empty string in declaration", () => {
				attest(() =>
					scope({
						// @ts-expect-error
						"box<t,,u>": "string"
					})
				).throwsAndHasTypeError(emptyGenericParameterMessage)
			})
			test("unclosed instantiation", () => {
				// @ts-expect-error
				attest(() => $.type("box<0,  1")).throwsAndHasTypeError(
					writeUnclosedGroupMessage(">")
				)
			})
			test("extra >", () => {
				attest(() =>
					// @ts-expect-error
					$.type("box<0,  this>>")
				).throwsAndHasTypeError(writeUnexpectedCharacterMessage(">"))
			})
			test("too few args", () => {
				attest(() =>
					// @ts-expect-error
					$.type("box<0,box<2|3>>")
				).throwsAndHasTypeError(
					writeInvalidGenericArgsMessage("box", ["t", "u"], ["2|3"])
				)
			})
			test("too many args", () => {
				attest(() =>
					// @ts-expect-error
					$.type("box<0, box<1, 2, 3>>")
				).throwsAndHasTypeError(
					writeInvalidGenericArgsMessage("box", ["t", "u"], ["1", " 2", " 3"])
				)
			})
			test("syntactic error in arg", () => {
				attest(() =>
					// @ts-expect-error
					$.type("box<1, number%0>")
				).throwsAndHasTypeError(writeInvalidDivisorMessage(0))
			})
			test("semantic error in arg", () => {
				attest(() =>
					// @ts-expect-error
					$.type("box<1,string%2>")
				).throwsAndHasTypeError(writeIndivisibleMessage("string"))
			})
		})
	})
})

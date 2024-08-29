import { attest, contextualize } from "@ark/attest"
import {
	intrinsic,
	writeIndivisibleMessage,
	writeUnboundableMessage,
	writeUnresolvableMessage,
	writeUnsatisfiedParameterConstraintMessage
} from "@ark/schema"
import { Hkt } from "@ark/util"
import { generic, scope, type, type Generic } from "arktype"
import { emptyGenericParameterMessage } from "arktype/internal/generic.ts"
import { writeUnclosedGroupMessage } from "arktype/internal/parser/string/reduce/shared.ts"
import { writeInvalidGenericArgCountMessage } from "arktype/internal/parser/string/shift/operand/genericArgs.ts"
import { writeInvalidDivisorMessage } from "arktype/internal/parser/string/shift/operator/divisor.ts"

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

		it("body completions", () => {
			// @ts-expect-error
			attest(() => type("<foobar>", { a: "foob", b: "bool" })).completions({
				foob: ["foobar"],
				bool: ["boolean"]
			})
		})

		it("args completions", () => {
			const g = type("<t>", { box: "t" })
			// @ts-expect-error
			attest(() => g({ box: "numb" })).completions({ numb: ["number"] })
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

		// TODO: this (https://github.com/arktypeio/arktype/issues/1081)
		// it("this in arg", () => {
		// 	const boxOf = type("<t>", {
		// 		box: "t"
		// 	})
		// 	const t = boxOf({
		// 		a: "string|this"
		// 	})

		// 	const expectedContents = type({ a: "string|this" })
		// 	const expectedBox = type({ box: expectedContents })

		// 	attest(t.t).type.toString.snap(`{ box: { a: string | cyclic } }`)
		// 	attest(t.json).equals(expectedBox.json)
		// })

		it("too few args", () => {
			const pair = type("<t, u>", ["t", "u"])
			// @ts-expect-error
			attest(() => pair("string")).type.errors(
				"Source has 1 element(s) but target requires 2"
			)
		})

		it("too many args", () => {
			const pair = type("<t, u>", ["t", "u"])
			// @ts-expect-error
			attest(() => pair("string", "boolean", "number")).type.errors(
				"Source has 3 element(s) but target allows only 2"
			)
		})
	})

	describe("constraints", () => {
		const testNonEmpty = (
			nonEmpty: Generic<[["arr", unknown[]]], "arr > 0", {}>
		) => {
			const t = nonEmpty("number[]")
			const expected = type("number[] > 0")

			attest<typeof expected.t>(t.t)
			attest(t.expression).equals(expected.expression)
		}

		it("can apply constraints to parameters", () => {
			const nonEmpty = type("<arr extends unknown[]>", "arr > 0")
			testNonEmpty(nonEmpty)
		})

		it("can apply constraints with whitespace", () => {
			const nonEmpty = type("<   arr     extends    unknown  []>", "arr > 0")
			testNonEmpty(nonEmpty)
		})

		it("constrained constraint", () => {
			const positiveToInteger = type("<n extends number > 0>", "n % 1")

			const t = positiveToInteger("number > 0")
			const expected = type("number.integer > 0")

			attest<typeof expected.t>(t.t)
			attest(t.expression).equals(expected.expression)
			// @ts-expect-error
			attest(() => positiveToInteger("number"))
				.throws(
					writeUnsatisfiedParameterConstraintMessage(
						"n",
						"number > 0",
						"number"
					)
				)
				.type.errors(
					`ErrorType<"Invalid argument for n", [expected: moreThan<0>]>`
				)
		})

		it("unsatisfied parameter string", () => {
			const $ = scope({
				"entry<k extends Key, v>": ["k", "v"],
				foobar: "entry<'foo', 'bar'>"
			})

			const types = $.export()

			const expected = type(["'foo'", "'bar'"])

			attest<typeof expected.t>(types.foobar.t)
			attest(types.foobar.expression).equals(expected.expression)

			// @ts-expect-error
			attest(() => $.type("entry<0, 1>")).throwsAndHasTypeError(
				writeUnsatisfiedParameterConstraintMessage("k", "string | symbol", "0")
			)
		})

		it("can parse constraint including alias from current scope", () => {
			const $ = scope({
				"entry<k extends key, v>": ["k", "v"],
				key: "string | symbol"
			})

			const types = $.export()

			const ok = types.entry("string", "number")

			attest<[string, number]>(ok.t)
			attest(ok.expression).snap("[string, number]")
			// @ts-expect-error
			attest(() => types.entry("boolean", "number"))
				.throws(
					writeUnsatisfiedParameterConstraintMessage(
						"k",
						"string | symbol",
						"boolean"
					)
				)
				.type.errors(
					`ErrorType<"Invalid argument for k", [expected: string | symbol]>`
				)
		})

		it("errors on unsatisfied constraints from current scope", () => {
			attest(() =>
				scope({
					"entry<k extends specialKey, v>": ["k", "v"],
					specialKey: "string | symbol",
					goodEntry: "entry<'foo', 1>",
					// @ts-expect-error
					badEntry: "entry<1, 0>"
				}).export()
			).throws(
				writeUnsatisfiedParameterConstraintMessage("k", "string | symbol", "1")
			)
		})

		it("constraint parse error", () => {
			attest(() => {
				// @ts-expect-error
				type("<n extends nummer>", "n > 0")
			}).throwsAndHasTypeError(writeUnresolvableMessage("nummer"))
		})

		it("constraint semantic parse error", () => {
			attest(() => {
				// @ts-expect-error
				type("<boo extends boolean > 0>", "boo")
			}).throwsAndHasTypeError(writeUnboundableMessage("boolean"))
		})

		it("default constraint is unknown", () => {
			// @ts-expect-error
			attest(() => type("<arr>", "arr > 0")).throwsAndHasTypeError(
				writeUnboundableMessage("unknown")
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

			// TODO: this (https://github.com/arktypeio/arktype/issues/1081)
			// it("this in args", ({ $ }) => {
			// 	const t = $.type("box<0,  this>")
			// 	type Expected = {
			// 		box: 0 | Expected
			// 	}
			// 	const standalone = type({
			// 		box: "0|this"
			// 	})

			// 	attest<Expected>(t.t)
			// 	attest<Expected>(standalone.t)
			// 	attest(t.json).equals(standalone.json)
			// })

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

			// TODO: this (https://github.com/arktypeio/arktype/issues/1081)
			// it("extra >", ({ $ }) => {
			// 	attest(() =>
			// 		// @ts-expect-error
			// 		$.type("box<0,  this>>")
			// 	).throwsAndHasTypeError(writeUnexpectedCharacterMessage(">"))
			// })

			it("too few args", ({ $ }) => {
				attest(() =>
					// @ts-expect-error
					$.type("box<0,box<2 | 3>>")
				).throwsAndHasTypeError(
					writeInvalidGenericArgCountMessage("box", ["t", "u"], ["2 | 3"])
				)
			})

			it("too many args", ({ $ }) => {
				attest(() =>
					// @ts-expect-error
					$.type("box<0, box<1, 2, 3>>")
				).throwsAndHasTypeError(
					writeInvalidGenericArgCountMessage("box", ["t", "u"], ["1", "2", "3"])
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
				).throwsAndHasTypeError(writeIndivisibleMessage(intrinsic.string))
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
					}).export()
				).throwsAndHasTypeError(emptyGenericParameterMessage)
			})
		}
	)

	it("args completions from type", () => {
		const g = type("<t>", { box: "t" })

		attest(() =>
			g({
				// @ts-expect-error
				foo: "numb",
				// @ts-expect-error
				bar: "big"
			})
		).completions({
			numb: ["number"],
			big: ["bigint"]
		})
	})

	contextualize.each(
		"standalone",
		() =>
			generic([
				"t",
				{
					foo: "number"
				}
			])({ boxOf: "t" }),
		it => {
			it("valid", g => {
				const t = g({
					foo: "number"
				})

				const expected = type({
					boxOf: {
						foo: "number"
					}
				})

				attest<typeof expected.t>(t.t)
				attest(t.expression).equals(expected.expression)
			})

			it("invalid", g => {
				attest(() =>
					// @ts-expect-error
					g({
						foo: "string"
					})
				)
					.throws(
						writeUnsatisfiedParameterConstraintMessage(
							"t",
							"{ foo: number }",
							"{ foo: string }"
						)
					)
					.type.errors(
						`ErrorType<"Invalid argument for t", [expected: { foo: number; }]>`
					)
			})

			it("completions in instantiation", g => {
				// @ts-expect-error
				attest(() => g({ foo: "numb" })).completions({
					numb: ["number"]
				})
			})

			it("completions in contraint", () => {
				attest(() =>
					generic([
						"t",
						{
							// @ts-expect-error
							foo: "numb"
						}
					])
				).completions({
					numb: ["number"]
				})
			})

			it("is available on type", () => {
				const nonEmpty = type.generic(["s", "string"])("s > 0")

				const expected = type("string.alpha > 0")
				const actual = nonEmpty("string.alpha")
				attest<typeof expected>(actual)
				attest(actual.expression).equals(expected.expression)
			})
		}
	)

	describe("hkt", () => {
		it("can infer a generic from an hkt", () => {
			class MyExternalClass<T> {
				data: T

				constructor(data: T) {
					this.data = data
				}
			}

			const validateExternalGeneric = generic("T")(
				args =>
					type("instanceof", MyExternalClass).and({
						data: args.T
					}),
				class extends Hkt {
					declare body: MyExternalClass<this[0]>
				}
			)

			const t = validateExternalGeneric({
				name: "string",
				age: "number"
			})

			attest<
				MyExternalClass<{
					name: string
					age: number
				}>
			>(t.t)

			attest(t.json).snap({
				required: [
					{
						key: "data",
						value: {
							required: [
								{ key: "age", value: "number" },
								{ key: "name", value: "string" }
							],
							domain: "object"
						}
					}
				],
				proto: "$ark.MyExternalClass",
				domain: "object"
			})

			// @ts-expect-error
			attest(() => validateExternalGeneric({ numb: "numb" })).completions({
				numb: ["number"]
			})
		})

		it("can infer constrained parameters", () => {
			const validateExternalGeneric = generic(
				["S", "string"],
				["N", { value: "number" }]
			)(
				args => [args.S.atLeastLength(1), args.N],
				class extends Hkt<[string, { value: number }]> {
					declare body: [this[0], this[1]]
				}
			)

			const t = validateExternalGeneric("string", { value: "1" })

			attest<
				[
					string,
					{
						value: 1
					}
				]
			>(t.t)

			attest(t.expression).snap("[string >= 1, { value: 1 }]")

			// @ts-expect-error
			attest(() => validateExternalGeneric("string", { value: "string" }))
				.throws(
					writeUnsatisfiedParameterConstraintMessage(
						"N",
						"{ value: number }",
						"{ value: string }"
					)
				)
				.type.errors(
					`ErrorType<"Invalid argument for N", [expected: { value: number; }]>`
				)

			attest(() =>
				// @ts-expect-error
				validateExternalGeneric({ numb: "numb" }, ["strin"])
			).completions({
				numb: ["number"],
				strin: ["string"]
			})
		})
	})

	// describe("cyclic", () => {
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
	// })
})

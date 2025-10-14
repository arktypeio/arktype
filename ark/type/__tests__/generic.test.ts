import { attest, contextualize } from "@ark/attest"
import { chainableNoOpProxy } from "@ark/attest/internal/utils.js"
import {
	intrinsic,
	writeIndivisibleMessage,
	writeUnboundableMessage,
	writeUnresolvableMessage,
	writeUnsatisfiedParameterConstraintMessage
} from "@ark/schema"
import { Hkt, writeUnclosedGroupMessage } from "@ark/util"
import { generic, scope, type, type Generic } from "arktype"
import { emptyGenericParameterMessage } from "arktype/internal/generic.ts"
import { writeInvalidGenericArgCountMessage } from "arktype/internal/parser/shift/operand/genericArgs.ts"
import { writeInvalidDivisorMessage } from "arktype/internal/parser/shift/operator/divisor.ts"
import { writeUnexpectedCharacterMessage } from "arktype/internal/parser/shift/operator/operator.ts"

contextualize(() => {
	describe("standalone", () => {
		it("unary", () => {
			const boxOf = type("<t>", { box: "t" })

			const SchrodingersBox = boxOf({ cat: { isAlive: "boolean" } })

			const Expected = type({
				box: {
					cat: { isAlive: "boolean" }
				}
			})

			attest<typeof Expected.t>(SchrodingersBox.t)
			attest(SchrodingersBox.json).equals(Expected.json)
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
			const SchrodingersBox = either(
				{ cat: { isAlive: "true" } },
				{ cat: { isAlive: "false" } }
			)

			const Expected = type(
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

			attest<typeof Expected.t>(SchrodingersBox.t)
			// ideally, this would be reduced to { cat: { isAlive: boolean } }:
			// https://github.com/arktypeio/arktype/issues/751
			attest(SchrodingersBox.json).equals(Expected.json)
		})

		it("referenced from other scope", () => {
			const types = scope({
				arrayOf: type("<t>", "t[]")
			}).export()

			const StringArray = types.arrayOf("string")
			const Expected = type("string[]")

			attest<typeof Expected.t>(StringArray.t)
			attest(StringArray.json).equals(Expected.json)
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

			const T = boxOf({
				a: "string | this"
			})

			attest(T.t).type.toString.snap(`{ box: { a: string | cyclic } }`)
			attest(T.expression).satisfies(/{ box: { a: type\d+ \| string } }/)
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

	describe("constraints", () => {
		const testNonEmpty = (
			nonEmpty: Generic<[["arr", unknown[]]], "arr > 0", {}>
		) => {
			const T = nonEmpty("number[]")
			const Expected = type("number[] > 0")

			attest<typeof Expected.t>(T.t)
			attest(T.expression).equals(Expected.expression)
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

			const T = positiveToInteger("number > 0")
			const Expected = type("number.integer > 0")

			attest<typeof Expected.t>(T.t)
			attest(T.expression).equals(Expected.expression)
			attest(() => positiveToInteger("number")).throws(
				writeUnsatisfiedParameterConstraintMessage("n", "number > 0", "number")
			)
		})

		it("unsatisfied parameter string", () => {
			const $ = scope({
				"entry<k extends Key, v>": ["k", "v"],
				foobar: "entry<'foo', 'bar'>"
			})

			const types = $.export()

			const Expected = type(["'foo'", "'bar'"])

			attest<typeof Expected.t>(types.foobar.t)
			attest(types.foobar.expression).equals(Expected.expression)

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

			const Ok = types.entry("string", "number")

			attest<[string, number]>(Ok.t)
			attest(Ok.expression).snap("[string, number]")
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
					`ErrorType<["Invalid argument for k", expected: string | symbol]>`
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
				const Expected = type({ box: "0|1" })

				attest(types.bitBox.json).equals(Expected.json)
				attest<typeof Expected.t>(types.bitBox.t)
			})

			it("nested", ({ $ }) => {
				const T = $.type("box<0|1, box<'one', 'zero'>>")

				const Expected = type({ box: ["0|1", "|", { box: "'one'|'zero'" }] })

				attest<typeof Expected.t>(T.t)
				attest(T.json).equals(Expected.json)
			})

			it("in expression", ({ $ }) => {
				const T = $.type("string | box<0, 1> | boolean")

				const Expected = type("string|boolean", "|", { box: "0|1" })

				attest<typeof Expected.t>(T.t)
				attest(T.json).equals(Expected.json)
			})

			it("right bounds", ({ $ }) => {
				// should be able to differentiate between > that is part of a right
				// bound and > that closes a generic instantiation
				const T = $.type("box<number>5, string>=7>")

				const Expected = type({
					box: "number>5|string>=7"
				})

				attest<typeof Expected.t>(T.t)
				attest(T.json).equals(Expected.json)
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
					$.type("box<0,  1>>")
				).throwsAndHasTypeError(writeUnexpectedCharacterMessage(">"))
			})

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
					"box<Foo>": {
						box: "Foo|Bar"
					},
					Foo: "'foo'",
					Bar: "'bar'"
				}).export()

				const T = types.box("'baz'")

				const Expected = type({ box: "'bar' | 'baz'" })

				attest<typeof Expected.t>(T.t)
				attest(T.json).equals(Expected.json)
			})

			it("declaration and instantiation leading and trailing whitespace", () => {
				const types = scope({
					"box< a , b >": {
						box: " a | b "
					},
					actual: "  box  < 'foo'  ,   'bar'  > "
				}).export()

				const Expected = type({
					box: "'foo' | 'bar'"
				})

				attest<typeof Expected.t>(types.actual.t)
				attest(Expected.json).equals(types.actual.json)
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

				const Expected = type("'internal' | 'external'")

				attest<typeof Expected.t>(b.internal.t)
				attest(b.internal.json).equals(Expected.json)
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
				Foo: "numb",
				// @ts-expect-error
				Bar: "big"
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
				const T = g({
					foo: "number"
				})

				const Expected = type({
					boxOf: {
						foo: "number"
					}
				})

				attest<typeof Expected.t>(T.t)
				attest(T.expression).equals(Expected.expression)
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
						`ErrorType<["Invalid argument for t", expected: { foo: number; }]>`
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

				const Expected = type("string.alpha > 0")
				const actual = nonEmpty("string.alpha")
				attest<typeof Expected>(actual)
				attest(actual.expression).equals(Expected.expression)
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

			const T = validateExternalGeneric({
				name: "string",
				age: "number"
			})

			attest<
				MyExternalClass<{
					name: string
					age: number
				}>
			>(T.t)

			attest(T.json).snap({
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
				proto: "$ark.MyExternalClass"
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

			const T = validateExternalGeneric("string", { value: "1" })

			attest<
				[
					string,
					{
						value: 1
					}
				]
			>(T.t)

			attest(T.expression).snap("[string >= 1, { value: 1 }]")

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
					`ErrorType<["Invalid argument for N", expected: { value: number; }]>`
				)

			attest(() =>
				// @ts-expect-error
				validateExternalGeneric("strin", { numb: "number" })
			).completions({
				strin: ["string"]
			})

			attest(() =>
				// @ts-expect-error
				validateExternalGeneric("string", { numb: "numb" })
			).completions({
				numb: ["number"]
			})
		})
	})

	// currently types only, runtime pending: https://github.com/arktypeio/arktype/issues/1082
	describe("cyclic", () => {
		const enable = false
		it("self-reference", () => {
			const getTypes = () =>
				scope({
					"alternate<a, b>": {
						// ensures old generic params aren't intersected with
						// updated values (would be never)
						swap: "alternate<b, a>",
						order: ["a", "b"]
					},
					reference: "alternate<0, 1>"
				}).export()
			const types = enable ? getTypes() : (chainableNoOpProxy as never)
			attest<[0, 1]>(types.reference.infer.swap.swap.order)
			attest<[1, 0]>(types.reference.infer.swap.swap.swap.order)
			const getFromCall = () => types.alternate("'off'", "'on'")
			const fromCall = enable ? getFromCall() : (chainableNoOpProxy as never)

			attest<["off", "on"]>(fromCall.infer.swap.swap.order)
			attest<["on", "off"]>(fromCall.infer.swap.swap.swap.order)
		})
		it("self-reference no params", () => {
			attest(() =>
				scope({
					"nest<t>": {
						// @ts-expect-error
						nest: "nest"
					}
				}).export()
			)
		})
	})

	it("assignability rules", () => {
		// like Type methods, generic invocation needs to return:
		//  	r extends infer _ ? _ : never
		// or similar to avoid breaking assignability

		it("unary", () => {
			const unary = type("<t>", "t")

			unary("0") satisfies type<0>
			// @ts-expect-error
			attest(() => unary("0") satisfies type<null>).type.errors(
				"not assignable to type 'null'"
			)
		})

		it("binary", () => {
			const binary = type("<t, u>", "t | u")

			binary("0", "1") satisfies type<0 | 1>
			// @ts-expect-error
			attest(() => binary("0", "1") satisfies type<string>).type.errors(
				"not assignable to type 'string'"
			)
		})

		it("ternary", () => {
			const ternary = type("<t, u, v>", "t | u | v")

			ternary("0", "1", "2") satisfies type<0 | 1 | 2>
			// @ts-expect-error
			attest(() => ternary("0", "1", "2") satisfies type<0>).type.errors(
				"not assignable to type '0'"
			)
		})

		it("quaternary", () => {
			const quaternary = type("<t, u, v, w>", "t | u | v | w")

			quaternary("0", "1", "2", "3") satisfies type<0 | 1 | 2 | 3>

			attest(
				// @ts-expect-error
				() => quaternary("0", "1", "2", "3") satisfies type<string>
			).type.errors("not assignable to type 'string'")
		})

		it("quinary", () => {
			const quinary = type("<t, u, v, w, x>", "t | u | v | w | x")

			quinary("0", "1", "2", "3", "4") satisfies type<0 | 1 | 2 | 3 | 4>

			attest(
				// @ts-expect-error
				() => quinary("0", "1", "2", "3", "4") satisfies type<null>
			).type.errors("not assignable to type 'null'")
		})

		it("senary", () => {
			const senary = type("<t, u, v, w, x, y>", "t | u | v | w | x | y")

			senary("0", "1", "2", "3", "4", "5") satisfies type<0 | 1 | 2 | 3 | 4 | 5>

			attest(
				// @ts-expect-error
				() => senary("0", "1", "2", "3", "4", "5") satisfies type<boolean>
			).type.errors("not assignable to type 'boolean'")
		})
	})

	describe("external", () => {
		it("docs def", () => {
			const createBox = <const def>(
				of: type.validate<def>
			): type.instantiate<{ of: def }> =>
				type.raw({
					box: of
				}) as never

			const BoxType = createBox("string")

			attest<{ of: string }>(BoxType.t)
		})

		it("docs def", () => {
			const createBox = <const def>(
				of: type.validate<def>
			): type.instantiate<{ of: def }> =>
				type.raw({
					box: of
				}) as never

			const BoxType = createBox("string")

			// @ts-expect-error
			attest(() => createBox("str")).completions({
				str: ["string"]
			})

			attest<{ of: string }>(BoxType.t)
		})
	})
})

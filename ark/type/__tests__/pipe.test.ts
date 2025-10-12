import { attest, contextualize } from "@ark/attest"
import {
	assertNodeKind,
	intrinsic,
	writeIndiscriminableMorphMessage,
	writeInvalidOperandMessage,
	writeMorphIntersectionMessage,
	type ArkErrors
} from "@ark/schema"
import { keywords, scope, type, type Type } from "arktype"
import type { Out, To } from "arktype/internal/attributes.ts"
import { writeMissingRightOperandMessage } from "arktype/internal/parser/shift/operand/unenclosed.ts"

contextualize(() => {
	it("base", () => {
		const T = type("number").pipe(data => `${data}`)
		attest<Type<(In: number) => Out<string>>>(T)
		attest<string>(T.infer)
		attest<number>(T.in.infer)
		const out = T(5)
		attest<string | type.errors>(out).equals("5")
		const result = T("foo")
		attest(result.toString()).snap("must be a number (was a string)")
	})

	it("disjoint", () => {
		attest(() => type("number>5").pipe(type("number<3"))).throws.snap(
			"ParseError: Intersection of > 5 and < 3 results in an unsatisfiable type"
		)
	})

	it("to", () => {
		const T = type("string.json.parse").to({
			name: "string",
			age: "number"
		})

		const tOut = T.out
		const Expected = type({
			name: "string",
			age: "number"
		})

		attest<typeof Expected.t>(tOut.t)
		attest(tOut.expression).equals(Expected.expression)
	})

	describe("to string syntax", () => {
		it("to validator", () => {
			const trimToNonEmpty = type("string.trim |> string > 0")
			const Expected = type("string.trim").to("string > 0")

			attest<typeof Expected>(trimToNonEmpty)
			attest(trimToNonEmpty.expression).equals(Expected.expression)
		})

		it("to morph", () => {
			const trimAndParseNumber = type("string.trim |> string.numeric.parse")
			const Expected = type("string.trim").to("string.numeric.parse")

			attest<typeof Expected>(trimAndParseNumber)
			attest(trimAndParseNumber.expression).equals(Expected.expression)
		})

		it("lower precedence than union", () => {
			const T = type("string.numeric.parse |> number.integer | number.safe")
			const Expected = type("string.numeric.parse").to(
				"number.integer | number.safe"
			)

			attest<typeof Expected>(T)
			attest(T.expression).equals(Expected.expression)
		})

		it("lower precedence than union reversed", () => {
			const T = type("string.numeric.parse | number.integer |> number.safe")
			const Expected = type("string.numeric.parse | number.integer").to(
				"number.safe"
			)

			attest<typeof Expected>(T)
			attest(T.expression).equals(Expected.expression)
		})

		it("missing operand", () => {
			// @ts-expect-error
			attest(() => type("string |>")).throws(
				writeMissingRightOperandMessage("|>")
			)
		})
	})

	it("to morph", () => {
		const restringifyUser = (o: object) => JSON.stringify(o)

		const T = type("string.json.parse").to([
			{
				name: "string",
				age: "number"
			},
			"=>",
			restringifyUser
		])

		attest(T.t).type.toString.snap("(In: string) => Out<string>")

		attest<string>(T.infer)
		attest(T.json).snap({
			in: "string",
			morphs: [
				"$ark.parseJson",
				{
					in: {
						required: [
							{ key: "age", value: "number" },
							{ key: "name", value: "string" }
						],
						domain: "object"
					},
					morphs: ["$ark.restringifyUser"]
				}
			]
		})
	})

	describe("try", () => {
		it("can catch thrown errors", () => {
			const ParseJson = type("string").pipe.try((s): object => JSON.parse(s))

			const out = ParseJson("[]")

			attest<ArkErrors | object>(out)
			attest(out).equals([])

			const badOut = ParseJson("{ unquoted: true }")

			attest(badOut.toString()).satisfies(
				/^must be valid according to an anonymous predicate \(was aborted due to error:\n {4}SyntaxError:/
			)
		})

		it("preserves validated out", () => {
			const T = type("string").pipe.try(
				s => JSON.parse(s),
				keywords.Array.readonly
			)

			const tOut = T.out
			const ExpectedOut = keywords.Array.readonly

			attest<typeof ExpectedOut.t>(tOut.t)
			attest(tOut.expression).equals(ExpectedOut.expression)
		})
	})

	it("can't directly constrain morph", () => {
		// @ts-expect-error
		attest(() => type("string.numeric.parse").atMostLength(5))
			.throws(
				writeInvalidOperandMessage(
					"maxLength",
					intrinsic.lengthBoundable,
					keywords.string.numeric.parse.internal
				)
			)
			.type.errors("Property 'atMostLength' does not exist")
	})

	it("within type", () => {
		const T = type(["boolean", "=>", data => !data])
		attest<Type<(In: boolean) => Out<boolean>>>(T)

		const serializedMorphs = T.internal.assertHasKind("morph").serializedMorphs

		attest(T.json).snap({
			in: [{ unit: false }, { unit: true }],
			morphs: serializedMorphs
		})

		const out = T(true)
		attest<boolean | type.errors>(out).equals(false)
		attest(T(1).toString()).snap("must be boolean (was 1)")
	})

	it("unit branches", () => {
		const T = type("0 | 1 | 2").pipe(n => n + 1)
		attest<(In: 0 | 1 | 2) => Out<number>>(T.t)

		attest(
			T.internal.select({ method: "assertFind", kind: "union" })
				.discriminantJson
		).snap({
			kind: "unit",
			path: [],
			cases: { "0": true, "1": true, "2": true }
		})

		attest(T(0)).equals(1)
		attest(T(3).toString()).snap("must be 0, 1 or 2 (was 3)")
	})

	it("type instance reference", () => {
		const User = type({
			name: "string",
			age: "number"
		})
		const parseUser = type("string").pipe(s => JSON.parse(s), User)

		attest<
			(In: string) => To<{
				name: string
				age: number
			}>
		>(parseUser.t)

		const validUser = { name: "David", age: 30 }
		attest(parseUser(JSON.stringify(validUser))).equals(validUser)
		const missingKey = { name: "David" }
		attest(parseUser(JSON.stringify(missingKey)).toString()).snap(
			"age must be a number (was missing)"
		)
	})

	it("many pipes", () => {
		const pipeAlphabet = type("'a'").pipe(
			s => `${s}b` as const,
			s => `${s}c` as const,
			s => `${s}d` as const,
			s => `${s}e` as const,
			s => `${s}f` as const,
			s => `${s}g` as const,
			s => `${s}h` as const,
			s => `${s}i` as const,
			s => `${s}j` as const,
			s => `${s}k` as const,
			s => `${s}l` as const,
			s => `${s}m` as const,
			s => `${s}n` as const,
			s => `${s}o` as const,
			s => `${s}p` as const,
			s => `${s}q` as const,
			s => `${s}r` as const
		)
		attest<"abcdefghijklmnopqr">(pipeAlphabet.infer)
		attest(pipeAlphabet("a")).equals("abcdefghijklmnopqr")
	})

	it("uses pipe for consecutive types", () => {
		const Bar = type({ bar: "number" })
		const T = type({ foo: "string" }).pipe(Bar)
		attest<{
			foo: string
			bar: number
		}>(T.t)
		const Expected = type({ foo: "string", bar: "number" })
		attest(T.json).equals(Expected.json)
	})

	it("disjoint", () => {
		attest(() => type("number>5").pipe(type("number<3"))).throws.snap(
			"ParseError: Intersection of > 5 and < 3 results in an unsatisfiable type"
		)
	})

	it("extract in/out at path", () => {
		const T = type({
			foo: type("number").pipe(n => `${n}`, type.string)
		})

		attest<{ foo: number }>(T.in.t)
		attest(T.in.expression).snap("{ foo: number }")

		attest<{ foo: string }>(T.out.t)
		attest(T.out.expression).snap("{ foo: string }")
	})

	it("uses pipe for many consecutive types", () => {
		const T = type({ a: "1" }).pipe(
			type({ b: "1" }),
			type({ c: "1" }),
			type({ d: "1" })
		)
		attest<
			Type<{
				a: 1
				b: 1
				c: 1
				d: 1
			}>
		>(T)
		const Expected = type({ a: "1", b: "1", c: "1", d: "1" })
		attest(T.json).equals(Expected.json)
	})

	it("two morphs", () => {
		const inefficientStringIsEmpty = type("string").pipe(
			s => s.length,
			length => length === 0
		)

		attest<(In: string) => Out<boolean>>(inefficientStringIsEmpty.t)
		attest(inefficientStringIsEmpty("")).equals(true)
		attest(inefficientStringIsEmpty("foo")).equals(false)
		attest(inefficientStringIsEmpty(0).toString()).snap(
			"must be a string (was a number)"
		)
	})

	it("any as out", () => {
		const T = type("string", "=>", s => s as any)
		attest<string>(T.in.infer)
		// https://github.com/arktypeio/arktype/issues/1023
		// attest<any>(T.infer)
	})

	it("never as out", () => {
		const T = type("string", "=>", s => s as never)
		attest<string>(T.in.infer)
		attest<never>(T.infer)
	})

	it("return error", () => {
		const divide100By = type("number", "=>", (n, ctx) =>
			n !== 0 ? 100 / n : ctx.error("non-zero")
		)
		attest<(In: number) => Out<number>>(divide100By.t)
		attest(divide100By(5)).equals(20)
		attest(divide100By(0).toString()).snap("must be non-zero (was 0)")
	})

	it("at path", () => {
		const T = type({ a: ["string", "=>", data => data.length] })
		attest<{ a: (In: string) => Out<number> }>(T.t)

		const input = { a: "four" }

		const out = T(input)

		attest<{ a: number } | type.errors>(out).equals({ a: 4 })
	})

	it("doesn't pipe on error", () => {
		const A = type({ a: "number" }).pipe(o => o.a + 1)

		const aMorphs = A.internal.assertHasKind("morph").serializedMorphs

		const B = type({ a: "string" }, "=>", o => o.a + "!")

		const bMorphs = B.internal.assertHasKind("morph").serializedMorphs

		const T = B.or(A)

		attest<
			| ((In: { a: string }) => Out<string>)
			| ((In: { a: number }) => Out<number>)
		>(T.t)
		attest(T.json).snap([
			{
				in: { required: [{ key: "a", value: "number" }], domain: "object" },
				morphs: aMorphs
			},
			{
				in: { required: [{ key: "a", value: "string" }], domain: "object" },
				morphs: bMorphs
			}
		])

		attest(T({ a: 2 })).snap(3)
	})

	it("in array", () => {
		const types = scope({
			lengthOfString: ["string", "=>", data => data.length],
			mapToLengths: "lengthOfString[]"
		}).export()
		attest<((In: string) => Out<number>)[]>(types.mapToLengths.t)
		const out = types.mapToLengths(["1", "22", "333"])
		attest<number[] | type.errors>(out).equals([1, 2, 3])
	})

	it("object to string", () => {
		const T = type([{ a: "string" }, "=>", data => JSON.stringify(data)])
		const out = T({ a: "foo" })
		attest<string | type.errors>(out).snap('{"a":"foo"}')
	})

	it(".out inferred based on validatedOut", () => {
		const Unvalidated = type("string").pipe(s => s.length)

		attest<number>(Unvalidated.infer)
		// .out won't be known at runtime
		attest<Type<unknown>>(Unvalidated.out)

		const validated = Unvalidated.pipe(type("number"))
		// now that the output is a validated, type, out can be used standalone
		attest<Type<number>>(validated.out)
	})

	it("intersection", () => {
		const $ = scope({
			b: "3.14",
			a: ["number", "=>", data => `${data}`],
			aAndB: () => $.type("a&b"),
			bAndA: () => $.type("b&a")
		})
		const types = $.export()
		assertNodeKind(types.bAndA.internal, "morph")
		assertNodeKind(types.aAndB.internal, "morph")

		attest<(In: 3.14) => Out<string>>(types.aAndB.t)
		attest(types.aAndB.json).snap({
			in: { unit: 3.14 },
			morphs: types.aAndB.internal.serializedMorphs
		})
		attest<typeof types.aAndB>(types.bAndA)
		attest(types.bAndA).equals(types.aAndB)
	})

	it("object intersection", () => {
		const $ = scope({
			// ideally the annotation for data wouldn't be required
			a: [{ a: "1" }, "=>", (data: { a: 1 }) => `${data}`],
			b: { b: "2" },
			c: "a&b"
		})
		const types = $.export()

		attest(types.c.t).type.toString.snap("(In: { a: 1; b: 2 }) => Out<string>")
		assertNodeKind(types.c.internal, "morph")
		attest(types.c.json).snap({
			in: {
				domain: "object",
				required: [
					{ key: "a", value: { unit: 1 } },
					{ key: "b", value: { unit: 2 } }
				]
			},
			morphs: types.c.internal.serializedMorphs
		})
	})

	it("union", () => {
		const types = scope({
			a: [
				"number",
				"=>",
				function _stringifyNumberUnionPipe(data) {
					return `${data}`
				}
			],
			b: "boolean",
			aOrB: "a|b",
			bOrA: "b|a"
		}).export()
		attest<boolean | ((In: number) => Out<string>)>(types.aOrB.t)

		attest(types.aOrB.json).snap([
			{ in: "number", morphs: ["$ark._stringifyNumberUnionPipe"] },
			{ unit: false },
			{ unit: true }
		])
		attest<typeof types.aOrB>(types.bOrA)
		attest(types.bOrA.json).equals(types.aOrB.json)
	})

	it("union with output", () => {
		const T = type("number|string.numeric.parse")
		attest<number>(T.infer)
		attest<string | number>(T.inferIn)
	})

	it("deep union", () => {
		const types = scope({
			a: {
				a: [
					"number>0",
					"=>",
					function _stringifyNumberUnionPipeDeep(data) {
						return `${data}`
					}
				]
			},
			b: { a: "Function" },
			c: "a|b"
		}).export()
		attest<
			| {
					a: (In: number) => Out<string>
			  }
			| {
					a: Function
			  }
		>(types.c.t)

		attest(types.c.json).snap([
			{ required: [{ key: "a", value: "Function" }], domain: "object" },
			{
				required: [
					{
						key: "a",
						value: {
							in: { domain: "number", min: { exclusive: true, rule: 0 } },
							morphs: ["$ark._stringifyNumberUnionPipeDeep"]
						}
					}
				],
				domain: "object"
			}
		])
	})

	it("chained reference", () => {
		const $ = scope({
			a: type("string").pipe(s => s.length),
			b: () => $.type("a").pipe(n => n === 0)
		})
		const types = $.export()
		attest<(In: string) => Out<boolean>>(types.b.t)
		assertNodeKind(types.b.internal, "morph")
		attest(types.b.json).snap({
			in: "string",
			morphs: types.b.internal.serializedMorphs
		})
	})

	it("chained nested", () => {
		const $ = scope({
			a: type("string").pipe(s => s.length),
			b: () => $.type({ a: "a" }).pipe(({ a }) => a === 0)
		})

		const types = $.export()
		attest<(In: { a: string }) => Out<boolean>>(types.b.t)
		assertNodeKind(types.b.internal, "morph")
		assertNodeKind(types.a.internal, "morph")
		attest(types.b.json).snap({
			in: {
				domain: "object",
				required: [
					{
						key: "a",
						value: {
							in: "string",
							morphs: types.a.internal.serializedMorphs
						}
					}
				]
			},
			morphs: types.b.internal.serializedMorphs
		})
	})

	it("directly nested", () => {
		const A = type("string", "=>", function _directlyNestedStringToLength(s) {
			return s.length
		})
		const T = type(
			{
				// doesn't work with a nested tuple expression here due to a TS limitation
				A
			},
			"=>",
			function _directlyNestedRoot({ A }) {
				return A === 0
			}
		)
		attest<(In: { A: string }) => Out<boolean>>(T.t)
		assertNodeKind(T.internal, "morph")
		attest(T.json).snap({
			in: {
				required: [
					{
						key: "A",
						value: {
							in: "string",
							morphs: ["$ark._directlyNestedStringToLength"]
						}
					}
				],
				domain: "object"
			},
			morphs: ["$ark._directlyNestedRoot"]
		})
	})

	it("discriminable tuple union", () => {
		const $ = scope({
			a: () =>
				$.type(["string"]).pipe(function _discriminableTupleUnionPipe(s) {
					return [...s, "!"]
				}),
			b: ["number"],
			c: () => $.type("a|b")
		})
		const types = $.export()

		attest<[number] | ((In: [string]) => Out<string[]>)>(types.c.t)

		attest(types.c.internal.assertHasKind("union").discriminantJson).snap({
			kind: "domain",
			path: ["0"],
			cases: {
				'"number"': {
					sequence: { prefix: ["number"] },
					proto: "Array",
					exactLength: 1
				},
				'"string"': {
					in: {
						sequence: { prefix: ["string"] },
						proto: "Array",
						exactLength: 1
					},
					morphs: ["$ark._discriminableTupleUnionPipe"]
				}
			}
		})
	})

	it("ArkTypeError not included in return", () => {
		const ParsedInt = type([
			"string",
			"=>",
			(s, ctx) => {
				const result = Number.parseInt(s)
				if (Number.isNaN(result)) return ctx.error("an integer string")

				return result
			}
		])
		attest<(In: string) => Out<number>>(ParsedInt.t)
		attest(ParsedInt("5")).snap(5)
		attest(ParsedInt("five").toString()).snap(
			'must be an integer string (was "five")'
		)
	})

	it("nullable return", () => {
		const toNullableNumber = type(["string", "=>", s => s.length || null])
		attest<(In: string) => Out<number | null>>(toNullableNumber.t)
	})

	it("undefinable return", () => {
		const toUndefinableNumber = type([
			"string",
			"=>",
			s => s.length || undefined
		])
		attest<(In: string) => Out<number | undefined>>(toUndefinableNumber.t)
	})

	it("null or undefined return", () => {
		const toMaybeNumber = type([
			"string",
			"=>",
			s =>
				s.length === 0 ? undefined
				: s.length === 1 ? null
				: s.length
		])
		attest<(In: string) => Out<number | null | undefined>>(toMaybeNumber.t)
	})

	it("deep intersection", () => {
		const types = scope({
			a: {
				a: [
					"number>0",
					"=>",
					function _deepIntersectionPipePlusOne(data) {
						return data + 1
					}
				]
			},
			b: { a: "1" },
			c: "a&b"
		}).export()
		attest<{ a: (In: 1) => Out<number> }>(types.c.t)

		attest(types.c.json).snap({
			required: [
				{
					key: "a",
					value: {
						in: { unit: 1 },
						morphs: ["$ark._deepIntersectionPipePlusOne"]
					}
				}
			],
			domain: "object"
		})
	})

	it("morph intersection", () => {
		attest(() =>
			scope({
				a: ["string", "=>", data => `${data}`],
				b: ["string", "=>", data => `${data}!!!`],
				c: "a&b"
			}).export()
		).throws(
			writeMorphIntersectionMessage(
				"(In: string) => Out<unknown>",
				"(In: string) => Out<unknown>"
			)
		)
	})

	it("indiscriminable union", () => {
		attest(() => {
			scope({
				a: ["/.*/", "=>", s => s.trim()],
				b: "string",
				c: "a|b"
			}).export()
		}).throws(
			writeIndiscriminableMorphMessage("string", "(In: /.*/) => Out<unknown>")
		)
	})

	it("deep morph intersection", () => {
		attest(() => {
			scope({
				a: { a: ["number", "=>", data => `${data}`] },
				b: { a: ["number", "=>", data => `${data}!!!`] },
				c: "a&b"
			}).export()
		}).throws(
			writeMorphIntersectionMessage(
				"(In: number) => Out<unknown>",
				"(In: number) => Out<unknown>"
			)
		)
	})

	it("deep indiscriminable", () => {
		const $ = scope({
			a: { foo: ["string", "=>", s => s.trim()] },
			b: { foo: "symbol" },
			c: { bar: "symbol" }
		})

		// this is fine as a | b can be discriminated via foo
		const T = $.type("a|b")
		attest<
			| {
					foo: (In: string) => Out<string>
			  }
			| {
					foo: symbol
			  }
		>(T.t)

		attest(() => $.type("a|c")).throws(
			writeIndiscriminableMorphMessage(
				"{ bar: symbol }",
				"{ foo: (In: string) => Out<unknown> }"
			)
		)
	})

	it("array double intersection", () => {
		attest(() => {
			scope({
				a: { a: ["number>0", "=>", data => data + 1] },
				b: { a: ["number>0", "=>", data => data + 2] },
				c: "a[]&b[]"
			}).export()
		}).throws(
			writeMorphIntersectionMessage(
				"(In: number > 0) => Out<unknown>",
				"(In: number > 0) => Out<unknown>"
			)
		)
	})

	it("undiscriminated morph at path", () => {
		attest(() => {
			scope({
				a: { a: ["string", "=>", s => s.trim()] },
				b: { b: "bigint" },
				c: { key: "a|b" }
			}).export()
		}).throws(
			writeIndiscriminableMorphMessage(
				"{ a: (In: string) => Out<unknown> }",
				"{ b: bigint }"
			)
		)
	})

	it("helper morph intersection", () => {
		attest(() =>
			type("string")
				.pipe(s => s.length)
				.and(type("string").pipe(s => s.length))
		).throws(
			writeMorphIntersectionMessage(
				"(In: string) => Out<unknown>",
				"(In: string) => Out<unknown>"
			)
		)
	})

	it("union helper undiscriminated", () => {
		attest(() =>
			type("string")
				.pipe(s => s.length)
				.or("'foo'")
		).throws(
			writeIndiscriminableMorphMessage("(In: string) => Out<unknown>", '"foo"')
		)
	})

	it("allows undiscriminated union if morphs are equal", () => {
		const T = type({ foo: "1" })
			.or({ bar: "1" })
			.pipe(o => Object.values(o))

		attest<
			(
				In:
					| {
							foo: 1
					  }
					| {
							bar: 1
					  }
			) => Out<1[]>
		>(T.t)

		const serializedMorphs = T.internal.assertHasKind("morph").serializedMorphs

		attest(T.json).snap({
			in: [
				{ required: [{ key: "bar", value: { unit: 1 } }], domain: "object" },
				{ required: [{ key: "foo", value: { unit: 1 } }], domain: "object" }
			],
			morphs: serializedMorphs
		})
		attest(T({ foo: 1 })).snap([1])
		attest(T({ bar: 1 })).snap([1])
		attest(T({ baz: 2 }).toString()).snap(
			"bar must be 1 (was missing) or foo must be 1 (was missing)"
		)
	})
	it("allows undiscriminated union if morphs at path are equal", () => {
		const T = type({ l: "1", n: "string.numeric.parse" }, "|", {
			r: "1",
			n: "string.numeric.parse"
		})

		attest(T).type.toString.snap(`Type<
	| { l: 1; n: (In: string) => To<number> }
	| { r: 1; n: (In: string) => To<number> },
	{}
>`)

		attest(T.expression).snap(
			"{ l: 1, n: (In: /^(?:(?!^-0\\.?0*$)(?:-?(?:(?:0|[1-9]\\d*)(?:\\.\\d+)?)|\\.\\d+?))$/) => Out<number> } | { n: (In: /^(?:(?!^-0\\.?0*$)(?:-?(?:(?:0|[1-9]\\d*)(?:\\.\\d+)?)|\\.\\d+?))$/) => Out<number>, r: 1 }"
		)
		attest(T({ l: 1, n: "234" })).snap({ l: 1, n: 234 })
		attest(T({ r: 1, n: "234" })).snap({ r: 1, n: 234 })
		attest(T({ l: 1, r: 1, n: "234" })).snap({ l: 1, r: 1, n: 234 })
		attest(T({ n: "234" }).toString()).snap(
			"l must be 1 (was missing) or r must be 1 (was missing)"
		)
	})
	it("fails on indiscriminable morph in nested union", () => {
		const indiscriminable = () =>
			type({
				foo: "boolean | string.date.parse"
			}).or({
				foo: "boolean | string.json.parse"
			})

		attest(indiscriminable).throws
			.snap(`ParseError: An unordered union of a type including a morph and a type with overlapping input is indeterminate:
Left: { foo: (In: string ) => Out<Date> | false | true }
Right: { foo: (In: string) => Out<{ [string]: $jsonObject | number | string | false | null | true }> | false | true }`)
	})

	it("multiple chained pipes", () => {
		const T = type("string.trim").to("string.lower")

		attest(T.t).type.toString.snap("(In: string) => To<string>")

		attest(T("Success")).equals("success")
		attest(T("success")).equals("success")
		attest(T("SUCCESS  ")).equals("success")
		attest(T("success  ")).equals("success")
	})

	// https://github.com/arktypeio/arktype/issues/1144
	it("multiple chained pipes with literal output", () => {
		const Base = type("string.trim").to("string.lower")

		const T = Base.to("'success'")

		attest<(In: string) => To<"success">>(T.t)

		attest(T("Success")).equals("success")
		attest(T("success")).equals("success")
		attest(T("SUCCESS  ")).equals("success")
		attest(T("success  ")).equals("success")
	})

	const appendLengthMorph = (s: string) => `${s}${s.length}`

	// https://discord.com/channels/957797212103016458/1291014543635517542
	it("repeated Type pipe", () => {
		const appendLength = type("string", "=>", appendLengthMorph)
		const appendLengths = type("string").pipe(appendLength, appendLength)

		attest(appendLengths.json).snap({
			in: "string",
			morphs: [
				{
					in: "string",
					morphs: [
						"$ark.appendLengthMorph",
						{ in: "string", morphs: ["$ark.appendLengthMorph"] }
					]
				}
			]
		})

		attest(appendLengths("a")).snap("a12")
	})

	// https://discord.com/channels/957797212103016458/1291014543635517542
	it("repeated Type pipe with intermediate morph", () => {
		const appendLength = type("string", "=>", appendLengthMorph)

		const appendSeparatorMorph = (s: string) => `${s}|`

		const appendSeparatedLengths = type("string").pipe(
			appendLength,
			appendLength,
			appendSeparatorMorph,
			appendLength,
			appendLength
		)

		attest(appendSeparatedLengths.json).snap({
			in: "string",
			morphs: [
				{
					in: "string",
					morphs: [
						"$ark.appendLengthMorph",
						{ in: "string", morphs: ["$ark.appendLengthMorph"] }
					]
				},
				"$ark.appendSeparatorMorph",
				{
					in: "string",
					morphs: [
						"$ark.appendLengthMorph",
						{ in: "string", morphs: ["$ark.appendLengthMorph"] }
					]
				}
			]
		})

		attest(appendSeparatedLengths("a")).snap("a12|45")
	})

	it("doesn't lose input prop morphs", () => {
		const T = type({
			foo: type("string").pipe(s => s.length)
		})
			.pipe(o => o)
			.to({
				foo: "number"
			})
		attest(T({ foo: "bar" })).snap({ foo: 3 })

		const types = scope({
			From: { a: ["1", "=>", () => 2] },
			Morph: ["From", "=>", e => e],
			To: { a: "2" }
		}).export()
		const U = types.Morph.pipe(e => e, types.To)
		const out = U({ a: 1 })
		attest<
			| ArkErrors
			| {
					a: 2
			  }
		>(out).snap({ a: 2 })
	})

	// https://github.com/arktypeio/arktype/issues/1185
	it("pipe doesn't run on rejected descendant prop", () => {
		let callCount = 0
		const T = type({
			key: "string"
		}).pipe(v => {
			callCount++
			return v
		})

		const out = T({})

		attest(out.toString()).snap("key must be a string (was missing)")
		attest(callCount).equals(0)
	})

	it("to tuple expression", () => {
		const T = type(["string.json.parse", "|>", { name: "string" }])

		const Expected = type("string.json.parse").to({ name: "string" })

		attest<typeof Expected>(T)
		attest(T.json).equals(Expected.json)
	})

	it("to args expression", () => {
		const T = type("string.json.parse", "|>", { name: "string" })

		const Expected = type("string.json.parse").to({ name: "string" })

		attest<typeof Expected>(T)
		attest(T.json).equals(Expected.json)
	})

	it("infers distributed pipes", () => {
		const T = type("string.numeric.parse | number").to("number > 0")
		attest(T.t).type.toString.snap("number | ((In: string) => To<number>)")
	})

	it("extracted from cyclic type", () => {
		const T = type({
			morphed: "string.numeric.parse",
			"nested?": "this"
		})

		const t = T.assert({ morphed: "5" })

		attest(t).equals({ morphed: 5 })
		attest<number>(t.morphed)
		attest<number | undefined>(t.nested?.morphed)
	})

	it("complex morphs are applied on correct path", () => {
		let c: null | 1

		const M = type({
			list: type("object")
				.pipe(e => e)
				.pipe(
					type({
						z: type("unknown").pipe(() => c)
					})
				)
				.array(),
			_: ["unknown", ":", () => true]
		})

		c = null
		attest(() =>
			M.assert({
				list: [{ z: "" }, { z: "" }]
			})
		).throws.snap("TraversalError: _ must be present (was missing)")

		c = 1
		attest(() =>
			M.assert({
				list: [{ z: "" }, { z: "" }]
			})
		).throws.snap("TraversalError: _ must be present (was missing)")
	})

	// https://github.com/arktypeio/arktype/pull/1464
	it("branched optimistic pipe union", () => {
		class TypeA {
			type = "typeA"
			constructor() {}
		}

		class TypeB {
			type = "typeB"
			constructor() {}
		}

		const typeA = new TypeA()

		const Thing = type.or(
			type.instanceOf(TypeB),
			type.string.pipe(_value => new TypeB()),
			type.instanceOf(TypeA).pipe(_value => new TypeB())
		)

		const out = Thing.assert(typeA)
		attest(out).instanceOf(TypeB)
	})

	// https://github.com/arktypeio/arktype/pull/1464
	it("complex pipes", () => {
		const inputData = [
			{
				OuterKey: [
					{
						MiddleKey: [
							{
								InnerKey: []
							}
						]
					}
				]
			}
		]

		const genericSchema = type("Record<string, unknown>[]")
			.pipe.try(arr =>
				arr.map(item => {
					const [kind, value] = Object.entries(item)[0]
					return { kind, value }
				})
			)
			.pipe(
				type({ kind: "string", value: "unknown" })
					.pipe(item => ({ kind: item.kind, value: item.value }))
					.array(),
				arr =>
					arr.reduce<Record<string, { value: unknown }>>(
						(acc, { kind, value }) => {
							acc[kind] = { value }
							return acc
						},
						{}
					),
				type({
					OuterKey: {
						value: type({
							MiddleKey: type({ InnerKey: type("object") })
								.array()
								.pipe(v => v[0])
						}).array()
					}
				})
			)

		const result = genericSchema(inputData)
		attest(result).equals({
			OuterKey: {
				value: [
					{
						MiddleKey: { InnerKey: [] }
					}
				]
			}
		})
	})

	// https://github.com/arktypeio/arktype/pull/1464
	it("nested pipes", () => {
		const parseFirstElementToNumber = type("string[]")
			.pipe(v => v[0])
			.to("string.numeric.parse")

		const extractAndParseFirstElement = type({
			Value: parseFirstElementToNumber
		})
			.array()
			.pipe(v => v[0])

		const Item = type({
			SubItem: extractAndParseFirstElement,
			Meta: {}
		})

		const T = type({
			Item: Item.array()
		})

		const data = {
			Item: [
				{
					SubItem: [
						{
							Value: ["0"]
						}
					]
				},
				{
					SubItem: [
						{
							Value: ["0"]
						}
					]
				}
			]
		}

		const result = T(data)

		attest(result.toString()).snap(`Item[0].Meta must be an object (was missing)
Item[1].Meta must be an object (was missing)`)
	})
})

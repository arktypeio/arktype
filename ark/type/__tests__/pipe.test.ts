import { attest, contextualize } from "@ark/attest"
import {
	assertNodeKind,
	flatProblemsByPath,
	intrinsic,
	registeredReference,
	writeInvalidOperandMessage,
	type ArkErrors
} from "@ark/schema"
import {
	discriminantJsonOf,
	writeIndiscriminableMorphMessage,
	writeMorphIntersectionMessage
} from "arksets/internal"
import type { exactEquals } from "@ark/util"
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

	it("calls a morph without a receiver", () => {
		const T = type("number").pipe(function (this: unknown) {
			return this === undefined
		})
		attest(T(1)).equals(true)
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
			morphs: [
				"string",
				"$ark.parseJson",
				{
					morphs: [
						{
							required: [
								{ key: "age", value: "number" },
								{ key: "name", value: "string" }
							],
							domain: "object"
						},
						registeredReference(restringifyUser)
					]
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

		it("errors carry the morph and what it threw", () => {
			const parseJson = (s: string): unknown => JSON.parse(s)
			const ParseJson = type("string").pipe.try(parseJson)
			const error = (ParseJson("{") as type.errors).issues[0]
			if (error.code !== "predicate") throw new Error()
			attest(error.morph).is(parseJson)
			attest(error.cause instanceof SyntaxError).equals(true)
			attest(error.predicate).equals(undefined)
			attest(error.message).equals(
				`must be valid according to parseJson (was aborted due to error:\n    ${error.cause}\n)`
			)
		})

		it("try errors print any thrown value", () => {
			const throwing = (thrown: unknown) =>
				type("string").pipe.try(() => {
					throw thrown
				})("x") as type.errors
			attest(throwing(Symbol("thrown")).issues[0].actual).snap(
				"aborted due to error:\n    Symbol(thrown)\n"
			)
			attest(throwing(Object.create(null)).issues[0].actual).snap(
				"aborted due to error:\n    {}\n"
			)
			const cyclic: any = new Error("cyclic")
			cyclic.self = cyclic
			attest(JSON.parse(JSON.stringify(throwing(cyclic)))[0].actual).snap(
				"aborted due to error:\n    Error: cyclic\n"
			)
			attest(JSON.parse(JSON.stringify(throwing(5n)))[0].actual).snap(
				"aborted due to error:\n    5\n"
			)
		})

		it("configured text reaches try errors", () => {
			const ParseJson = scope(
				{},
				{
					predicate: {
						actual: (data, ctx) =>
							`${data}, which threw ${(ctx.cause as Error).name}`
					}
				}
			)
				.type("string")
				.pipe.try(s => JSON.parse(s))
			attest(ParseJson("{").toString()).snap(
				"must be valid according to an anonymous predicate (was {, which threw SyntaxError)"
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
		const notMorph = (data: boolean) => !data
		const T = type(["boolean", "=>", notMorph])
		attest<Type<(In: boolean) => Out<boolean>>>(T)

		attest(T.json).snap({
			morphs: [[{ unit: false }, { unit: true }], registeredReference(notMorph)]
		})

		const out = T(true)
		attest<boolean | type.errors>(out).equals(false)
		attest(T(1).toString()).snap("must be boolean (was 1)")
	})

	it("unit branches", () => {
		const T = type("0 | 1 | 2").pipe(n => n + 1)
		attest<(In: 0 | 1 | 2) => Out<number>>(T.t)

		attest(
			discriminantJsonOf(
				T.internal.select({ method: "assertFind", kind: "union" })
			)
		).snap({
			kind: "unit",
			path: [],
			cases: { "0": true, "1": true, "2": true }
		})

		attest(T(0)).equals(1)
		attest(T(3).toString()).snap("must be 0, 1 or 2 (was 3)")
	})

	it("unit branch a morph's input overlaps, jitless", () => {
		// discriminated, so the union is determinate though the morph's input
		// holds "a", which an uncompiled transform must still send to its case
		const T = scope({}, { jitless: true }).type("string.url.parse | '' | 'a'")
		attest(T("a")).equals("a")
		attest(T("")).equals("")
		attest(T("https://a.b")).instanceOf(URL)
		attest(T("x").toString()).snap('must be a URL string (was "x")')
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

	// https://github.com/arktypeio/arktype/issues/1023
	it("any as out", () => {
		const T = type("string", "=>", s => s as any)
		attest<string>(T.in.infer)
		attest<any>(T.infer)
	})

	it("any as out beside other props", () => {
		const BesidePlain = type({
			a: ["string", "=>", s => s as any],
			b: "number"
		})
		attest(BesidePlain.infer).type.toString.snap("{ a: any; b: number }")
		attest(BesidePlain.inferIn).type.toString.snap("{ a: string; b: number }")

		const BesideMorph = type({
			a: ["string", "=>", s => s as any],
			n: "string.numeric.parse"
		})
		attest(BesideMorph.infer).type.toString.snap("{ a: any; n: number }")
		attest(BesideMorph.inferIn).type.toString.snap("{ a: string; n: string }")
	})

	it("any as out in an array, tuple or union", () => {
		const MorphAny = type("string", "=>", s => s as any)
		const List = MorphAny.array()
		attest(List.infer).type.toString.snap("any[]")
		attest(List.inferIn).type.toString.snap("string[]")
		const Tuple = type([MorphAny, "number"])
		attest(Tuple.infer).type.toString.snap("[any, number]")
		attest(Tuple.inferIn).type.toString.snap("[string, number]")
		const Union = type({ a: MorphAny }).or("string")
		attest(Union.infer).type.toString.snap("string | { a: any }")
		attest(Union.inferIn).type.toString.snap("string | { a: string }")
	})

	it("any as out in a cyclic scope", () => {
		const types = scope({
			node: { a: ["string", "=>", s => s as any], "next?": "node" }
		}).export()
		attest(types.node.infer).type.toString.snap("{ a: any; next?: any }")
	})

	it("function returning any as out", () => {
		const MorphFnAny = type("string").pipe(
			s => (x: string) => JSON.parse(s + x)
		)
		attest(MorphFnAny.infer).type.toString.snap("(x: string) => any")
		attest(type({ f: MorphFnAny }).infer).type.toString.snap(
			"{ f: (x: string) => any }"
		)
		attest(MorphFnAny.array().infer).type.toString.snap(
			"((x: string) => any)[]"
		)
		attest(type([MorphFnAny, "number"]).infer).type.toString.snap(
			"[(x: string) => any, number]"
		)
		attest(MorphFnAny.or("number").infer).type.toString.snap(
			"number | ((x: string) => any)"
		)
	})

	it("JSON.parse as out", () => {
		const T = type({ parse: type("string").pipe(() => JSON.parse) })
		attest<true, exactEquals<typeof T.infer, { parse: typeof JSON.parse }>>()
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

	it("stops at a morph returning any error its ctx.error added", () => {
		let piped = 0
		const T = type("string").pipe(
			(s, ctx) => {
				const first = ctx.error("a letter")
				ctx.error("a digit")
				return first
			},
			() => piped++
		)
		attest(T("x").toString()).snap(`("x") must be...
  ◦ a letter
  ◦ a digit`)
		attest(piped).equals(0)
	})

	it("passes on an error an earlier morph added as a later one's output", () => {
		let added: unknown
		let received: unknown
		const T = type("string").pipe(
			(s, ctx) => {
				added = ctx.error("a letter")
				return s
			},
			() => added,
			e => {
				received = e
				return "received"
			}
		)
		attest(T("x").toString()).snap('must be a letter (was "x")')
		attest(received === added).equals(true)
	})

	it("returns a type's output when called with a morph's ctx", () => {
		const T = type("string").pipe((s, ctx) =>
			// a Type's signature takes only data
			type({ a: "string.trim" }).internal(JSON.parse(s), ctx)
		)
		attest(T('{"a":" x "}')).equals({ a: "x" })
	})

	it("flattens an intersection a piped node raises into the one at its path", () => {
		// a cyclic node a morph pipes to is applied in its own traversal, whose errors are merged
		const $ = scope({ node: { s: "(string >= 5) & /^a/", "next?": "node" } })
		const T = type({ s: "string" }).pipe((o, ctx) => {
			ctx.error({ expected: "own", path: ["s"] })
			return o
		}, $.type("node"))
		const out = T({ s: "b" }) as ArkErrors
		attest(out.summary).snap(`s (an object) must be...
  ◦ own
  ◦ matched by ^a
  ◦ at least length 5`)
		attest(flatProblemsByPath(out)).snap({
			s: [
				"must be own (was an object)",
				'must be matched by ^a (was "b")',
				"must be at least length 5 (was 1)"
			]
		})
	})

	it("checks a result only against the errors its morph added", () => {
		let reads = 0
		let counted: object | undefined
		const T = type({ v: "number" })
			.pipe((o, ctx) => {
				// counts each error read in the errors added so far
				counted ??= ctx.errors._ = new Proxy(ctx.errors._, {
					get: (target, k) => {
						if (typeof k === "string" && /^\d+$/.test(k)) reads++
						return Reflect.get(target, k)
					}
				})
				return { w: o.v }
			})
			.array()
		const data = Array.from({ length: 1000 }, (_, i) =>
			i % 2 ? { v: i } : { v: "x" }
		)
		attest(T(data).toString().split("\n").length).equals(500)
		attest(reads < 2 * data.length).equals(true)
	})

	it("at path", () => {
		const T = type({ a: ["string", "=>", data => data.length] })
		attest<{ a: (In: string) => Out<number> }>(T.t)

		const input = { a: "four" }

		const out = T(input)

		attest<{ a: number } | type.errors>(out).equals({ a: 4 })
	})

	it("morph union error paths", () => {
		const Either = type({ a: "string" }).or({ b: "string" })
		const T = type({ v: ["string", "=>", () => Either({})] })

		attest(T({ v: "x" }).toString()).snap(
			"v.a must be a string (was missing) or v.b must be a string (was missing)"
		)
	})

	it("nested morph error paths", () => {
		const $ = scope({})
		const Inner = $.type({ c: "number" })
		const Middle = $.type({ b: ["object", "=>", o => Inner(o)] })
		const Outer = $.type({ a: ["object", "=>", o => Middle(o)] })
		const out = Outer({ a: { b: { c: "x" } } }) as ArkErrors

		attest(out.toString()).snap("a.b.c must be a number (was a string)")
		attest(out.issues[0].path).snap(["a", "b", "c"])
	})

	it("unary morph arity", () => {
		const T = type({
			a: ["string", "=>", (s: string, ...rest: unknown[]) => rest.length]
		})
		attest(T.assert({ a: "x" }).a).equals(0)
	})

	it("calls a morph as it was parsed after its length changes", () => {
		const double = (n: number) => n * 2
		type(["number", "=>", double])
		Object.defineProperty(double, "length", { value: 2 })
		const T = type(["number", "=>", double])
		// compiled once it's used again
		attest([T(1), T(1)]).equals([2, 2])
	})

	it("array props before elements", () => {
		const $ = scope({})
		const calls: string[] = []
		const Trimmed = $.type("string").pipe(s => {
			calls.push(s)
			return s.trim()
		})
		const T = $.type(Trimmed.array()).and({ foo: Trimmed })
		const out = T.assert(Object.assign([" a"], { foo: " f" }))
		attest(calls).equals([" f", " a"])
		attest(out.foo).equals("f")
		attest([...out]).equals(["a"])
	})

	it("doesn't pipe on error", () => {
		const addOne = (o: { a: number }) => o.a + 1
		const appendExclamation = (o: { a: string }) => o.a + "!"
		const A = type({ a: "number" }).pipe(addOne)
		const B = type({ a: "string" }, "=>", appendExclamation)

		const T = B.or(A)

		attest<
			| ((In: { a: string }) => Out<string>)
			| ((In: { a: number }) => Out<number>)
		>(T.t)
		attest(T.json).snap([
			{
				morphs: [
					{ required: [{ key: "a", value: "number" }], domain: "object" },
					registeredReference(addOne)
				]
			},
			{
				morphs: [
					{ required: [{ key: "a", value: "string" }], domain: "object" },
					registeredReference(appendExclamation)
				]
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
		const stringifyNumberMorph = (data: number) => `${data}`
		const $ = scope({
			b: "3.14",
			a: ["number", "=>", stringifyNumberMorph],
			aAndB: () => $.type("a&b"),
			bAndA: () => $.type("b&a")
		})
		const types = $.export()

		attest<(In: 3.14) => Out<string>>(types.aAndB.t)
		attest(types.aAndB.json).snap({
			morphs: [{ unit: 3.14 }, registeredReference(stringifyNumberMorph)]
		})
		attest<typeof types.aAndB>(types.bAndA)
		attest(types.bAndA).equals(types.aAndB)
	})

	it("intersection keeps its inputs' morphs", () => {
		const id = (o: object) => o
		const A = type({ a: "string.numeric.parse" }).pipe(id)
		const B = type({ b: "string" }).pipe(id)
		const T = A.and(B) as type.Any
		attest(T({ a: "5", b: "x" })).equals({ a: 5, b: "x" })
	})

	it("object intersection", () => {
		const _pipeScopedObjectIntersection = (data: { a: 1 }) => `${data}`
		const $ = scope({
			a: [{ a: "1" }, "=>", _pipeScopedObjectIntersection],
			b: { b: "2" },
			c: "a&b"
		})
		const types = $.export()

		attest(types.c.t).type.toString.snap("(In: { a: 1; b: 2 }) => Out<string>")
		attest(types.c.json).snap({
			morphs: [
				{
					required: [
						{ key: "a", value: { unit: 1 } },
						{ key: "b", value: { unit: 2 } }
					],
					domain: "object"
				},
				registeredReference(_pipeScopedObjectIntersection)
			]
		})
	})

	it("union", () => {
		const _stringifyNumberUnionPipe = (data: number) => `${data}`
		const types = scope({
			a: ["number", "=>", _stringifyNumberUnionPipe],
			b: "boolean",
			aOrB: "a|b",
			bOrA: "b|a"
		}).export()
		attest<boolean | ((In: number) => Out<string>)>(types.aOrB.t)

		attest(types.aOrB.json).snap([
			{
				morphs: ["number", registeredReference(_stringifyNumberUnionPipe)]
			},
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
		const _stringifyNumberUnionPipeDeep = (data: number) => `${data}`
		const types = scope({
			a: { a: ["number>0", "=>", _stringifyNumberUnionPipeDeep] },
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

		attest(types.c.json).snap({
			required: [
				{
					key: "a",
					value: [
						{
							morphs: [
								{ domain: "number", min: { exclusive: true, rule: 0 } },
								registeredReference(_stringifyNumberUnionPipeDeep)
							]
						},
						"Function"
					]
				}
			],
			domain: "object"
		})
	})

	it("chained reference", () => {
		const stringToLength = (s: string) => s.length
		const isZeroLength = (n: number) => n === 0
		const $ = scope({
			a: type("string").pipe(stringToLength),
			b: () => $.type("a").pipe(isZeroLength)
		})
		const types = $.export()
		attest<(In: string) => Out<boolean>>(types.b.t)

		attest(types.b.json).snap({
			morphs: [
				"string",
				registeredReference(stringToLength),
				registeredReference(isZeroLength)
			]
		})
	})

	it("chained nested", () => {
		const chainedNestedToLength = (s: string) => s.length
		const chainedNestedGetA = ({ a }: { a: number }) => a === 0
		const $ = scope({
			a: type("string").pipe(chainedNestedToLength),
			b: () => $.type({ a: "a" }).pipe(chainedNestedGetA)
		})

		const types = $.export()
		attest<(In: { a: string }) => Out<boolean>>(types.b.t)
		attest(types.b.json).snap({
			morphs: [
				{
					required: [
						{
							key: "a",
							value: {
								morphs: ["string", registeredReference(chainedNestedToLength)]
							}
						}
					],
					domain: "object"
				},
				registeredReference(chainedNestedGetA)
			]
		})
	})

	it("directly nested", () => {
		const _directlyNestedStringToLength = (s: string) => s.length
		const _directlyNestedRoot = ({ A }: { A: number }) => A === 0
		const A = type("string", "=>", _directlyNestedStringToLength)
		const T = type(
			{
				// doesn't work with a nested tuple expression here due to a TS limitation
				A
			},
			"=>",
			_directlyNestedRoot
		)
		attest<(In: { A: string }) => Out<boolean>>(T.t)
		assertNodeKind(T.internal, "morph")
		attest(T.json).snap({
			morphs: [
				{
					required: [
						{
							key: "A",
							value: {
								morphs: [
									"string",
									registeredReference(_directlyNestedStringToLength)
								]
							}
						}
					],
					domain: "object"
				},
				registeredReference(_directlyNestedRoot)
			]
		})
	})

	it("discriminable tuple union", () => {
		const _discriminableTupleUnionPipe = (s: [string]) => [...s, "!"]
		const $ = scope({
			a: () => $.type(["string"]).pipe(_discriminableTupleUnionPipe),
			b: ["number"],
			c: () => $.type("a|b")
		})
		const types = $.export()

		attest<[number] | ((In: [string]) => Out<string[]>)>(types.c.t)

		attest(discriminantJsonOf(types.c.internal.assertIs("union"))).snap({
			kind: "domain",
			path: ["0"],
			cases: {
				'"number"': {
					sequence: { prefix: ["number"] },
					proto: "Array",
					exactLength: 1
				},
				'"string"': {
					morphs: [
						{
							sequence: { prefix: ["string"] },
							proto: "Array",
							exactLength: 1
						},
						registeredReference(_discriminableTupleUnionPipe)
					]
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
		const _deepIntersectionPipePlusOne = (data: number) => data + 1
		const types = scope({
			a: { a: ["number>0", "=>", _deepIntersectionPipePlusOne] },
			b: { a: "1" },
			c: "a&b"
		}).export()
		attest<{ a: (In: 1) => Out<number> }>(types.c.t)

		attest(types.c.json).snap({
			required: [
				{
					key: "a",
					value: {
						morphs: [
							{ unit: 1 },
							registeredReference(_deepIntersectionPipePlusOne)
						]
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

	it("indiscriminable union past a redundant branch", () => {
		attest(() =>
			type.or(
				{ "kind?": "'b'" },
				{ a: "number", kind: "1" },
				{ kind: "'b'" },
				{ kind: "number", "+": "delete" }
			)
		).throws(
			writeIndiscriminableMorphMessage(
				"{ a: number, kind: 1 }",
				"{ kind: number, + (undeclared): delete }"
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

	it("undiscriminated morph shared through a deep DAG", () => {
		// each level doubles the paths to the morph, so comparing their refs
		// pairwise outlasts the timeout
		let Trimmed: type.Any = type(["string", "=>", (s: string) => s.trim()])
		let Unmorphed: type.Any = type("string")
		for (let i = 0; i < 13; i++) {
			Trimmed = type({ "l?": Trimmed, "r?": Trimmed.array() })
			Unmorphed = type({ "l?": Unmorphed, "r?": Unmorphed.array() })
		}
		attest(() => Trimmed.or(Unmorphed)).throws(
			writeIndiscriminableMorphMessage(Unmorphed.expression, Trimmed.expression)
		)
	})

	it("undiscriminated morph at an element", () => {
		const Trimmed = ["string", "=>", (s: string) => s.trim()] as const
		const Measured = ["string", "=>", (s: string) => s.length] as const
		attest(() =>
			type({ a: [Trimmed] }).or({ a: [Measured], b: "string" })
		).throws(
			writeIndiscriminableMorphMessage(
				"{ a: [(In: string) => Out<unknown>] }",
				"{ a: [(In: string) => Out<unknown>], b: string }"
			)
		)
		attest(() =>
			type({ a: [{ b: Trimmed }] }).or({ a: [{ b: Measured }], c: "string" })
		).throws(
			writeIndiscriminableMorphMessage(
				"{ a: [{ b: (In: string) => Out<unknown> }] }",
				"{ a: [{ b: (In: string) => Out<unknown> }], c: string }"
			)
		)
		attest(() =>
			type({ a: [{ b: Trimmed }, "[]"] }).or({
				a: [{ b: Measured }, "[]"],
				c: "string"
			})
		).throws(
			writeIndiscriminableMorphMessage(
				"{ a: { b: (In: string) => Out<unknown> }[] }",
				"{ a: { b: (In: string) => Out<unknown> }[], c: string }"
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

	it("indeterminate union hints at a fix", () => {
		attest(() =>
			type("unknown")
				.pipe(v => Number(v))
				.to("number.integer")
				.or("null")
		).throws
			.snap(`ParseError: An unordered union of a type including a morph and a type with overlapping input is indeterminate:
Left: (In: unknown) => To<number % 1>
Right: null
Make their inputs disjoint, e.g. by narrowing the morph's input, or pipe the union of their inputs to a single morph.`)

		const Narrowed = type("string.integer.parse | number.integer | null")
		attest<number | null>(Narrowed.infer)
		attest(Narrowed("5")).equals(5)

		const Piped = type("unknown").pipe(v => (v === null ? v : Number(v)))
		attest(Piped(null)).equals(null)
	})

	it("allows undiscriminated union if morphs are equal", () => {
		const getObjectValues = (o: { foo: 1 } | { bar: 1 }) => Object.values(o)
		const T = type({ foo: "1" }).or({ bar: "1" }).pipe(getObjectValues)

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

		attest(T.json).snap({
			morphs: [
				[
					{ required: [{ key: "bar", value: { unit: 1 } }], domain: "object" },
					{ required: [{ key: "foo", value: { unit: 1 } }], domain: "object" }
				],
				registeredReference(getObjectValues)
			]
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
			"{ l: 1, n: (In: /^(?:(?!^-0\\.?0*(?:[Ee][+-]?\\d+)?$)(?:-?(?:(?:0|[1-9]\\d*)(?:\\.\\d+)?)|\\.\\d+?)(?:[Ee][+-]?\\d+)?)$/ & parsesFinite) => Out<number> } | { n: (In: /^(?:(?!^-0\\.?0*(?:[Ee][+-]?\\d+)?$)(?:-?(?:(?:0|[1-9]\\d*)(?:\\.\\d+)?)|\\.\\d+?)(?:[Ee][+-]?\\d+)?)$/ & parsesFinite) => Out<number>, r: 1 }"
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
Left: { foo: (In: string.date) => Out<Date> | false | true }
Right: { foo: (In: string) => Out<number | string | { [string]: $jsonData } & isPlainObjectOrArray | false | null | true> | false | true }
Make their inputs disjoint, e.g. by narrowing the morph's input, or pipe the union of their inputs to a single morph.`)
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
			morphs: [
				"string",
				{
					morphs: [
						"string",
						"$ark.appendLengthMorph",
						{ morphs: ["string", "$ark.appendLengthMorph"] }
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
			morphs: [
				"string",
				{
					morphs: [
						"string",
						registeredReference(appendLengthMorph),
						{ morphs: ["string", registeredReference(appendLengthMorph)] }
					]
				},
				registeredReference(appendSeparatorMorph),
				{
					morphs: [
						"string",
						registeredReference(appendLengthMorph),
						{ morphs: ["string", registeredReference(appendLengthMorph)] }
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

	it("extract in/out preserves undeclared rejection", () => {
		const T = type({
			"+": "reject",
			foo: "true"
		})

		attest(T.in.expression).snap("{ foo: true, + (undeclared): reject }")
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

	it("assert with root morph errors", () => {
		const N = type("number")
		const $ = scope({})
		const T = $.type("string").pipe(s => N(s))
		attest(() => T.assert("x")).throws("must be a number (was a string)")
		attest(() => T.or("boolean").assert("x")).throws(
			"must be a number (was a string)"
		)
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

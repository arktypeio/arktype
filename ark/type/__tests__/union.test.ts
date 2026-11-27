import { attest, contextualize } from "@ark/attest"
import {
	intrinsic,
	rootSchema,
	writeIndivisibleMessage,
	writeUnresolvableMessage,
	type UnionNode
} from "@ark/schema"
import { scope, type } from "arktype"
import { writeMissingRightOperandMessage } from "arktype/internal/parser/shift/operand/unenclosed.ts"

contextualize(() => {
	it("binary", () => {
		const Binary = type("number|string")
		attest<number | string>(Binary.infer)
		attest(Binary.json).snap(["number", "string"])
	})

	it("nary", () => {
		const Nary = type("false|null|undefined|0|''")
		attest<false | "" | 0 | null | undefined>(Nary.infer)
		const Expected = type("===", false, null, undefined, 0, "")
		attest(Nary.json).equals(Expected.json)
	})

	it("subtype pruning", () => {
		const T = type({ a: "string" }, "|", { a: "'foo'" })
		const Expected = type({ a: "string" })
		attest<typeof Expected>(T)
		attest(T.json).equals(Expected.json)
	})

	it("multiple subtypes pruned", () => {
		const T = type("'foo'|'bar'|string|'baz'|/.*/")
		const Expected = type("string")
		attest<string>(T.infer)
		attest(T.json).equals(Expected.json)
	})

	it("compiled allows checks each of two domains", () => {
		const T = type("number | null")
		// the first data is checked uncompiled
		T.allows(null)
		attest([null, 0, NaN, undefined, "0"].map(v => T.allows(v))).equals([
			true,
			true,
			false,
			false,
			false
		])
	})

	it("compiled apply of one domain or a unit it allows", () => {
		const T = type({ n: "number > 0 | null", s: "string > 0 | undefined" })
		// the first data is checked uncompiled
		T({ n: null, s: undefined })
		attest(T({ n: null, s: undefined })).equals({ n: null, s: undefined })
		attest(T({ n: 0, s: "" }).toString()).snap(`n must be positive
s must be non-empty`)
		attest(T({ n: "1", s: null }).toString()).snap(`n must be a number or null
s must be a string or undefined`)
	})

	it("boolean is a union of true | false", () => {
		const T = type("true|false")
		attest(T.infer).type.toString("boolean")
		attest(T.json).equals(type("boolean").json)
	})

	it("nested tuple union", () => {
		const T = type(["string|bigint", "|", ["number", "|", "boolean"]])
		attest<string | number | bigint | boolean>(T.infer)
		attest(T.json).equals(type("string|bigint|number|boolean").json)
	})

	it("union of object arrays doesn't throw on non-object element", () => {
		// https://github.com/arktypeio/arktype/issues/1458
		// checking a later element whose basis (object) fails must not attempt
		// an `in` check against a primitive earlier collected element
		const TypeAB = type.or("string", { objB: "string" })
		const TypeC = type({ objC: "string" })
		const TypeABC = type([TypeAB.array(), "|", TypeC.array()])

		attest(
			TypeABC([{ objB: "text b" }, "test a", { objC: "text c" }]).toString()
		).snap("[2].objB must be a string or [0].objC must be a string")

		attest(
			TypeABC(["test a", { objB: "text b" }, { objC: "text c" }]).toString()
		).snap("[2].objB must be a string or [0] must be an object")
	})

	it("writes each path as its own error would", () => {
		attest(type("number[] | string[]")(["a", 1]).toString()).snap(
			"[0] must be a number or [1] must be a string"
		)
		attest(type(["number", "number"]).or(["string"])([1]).toString()).snap(
			"must be exactly 2 items or [0] must be a string"
		)
	})

	it("lists a branch failing at a never key", () => {
		const T = type({ "[string]": "null", "a?": "string" }).or("null[]")
		attest(T({ a: "" }).toString()).snap("a must be never or must be an array")
	})

	it("lists each value a missing key allows once", () => {
		const T = type({ a: "string | number", b: "string" }).or({
			a: "string",
			c: "number"
		})
		attest(T({}).toString()).snap("a must be a string or a number")
		const Units = type({ a: "1 | 2", b: "string" }).or({
			a: "2 | 3",
			c: "number"
		})
		attest(Units({}).toString()).snap("a must be 1, 2 or 3")
	})

	it("described", () => {
		const T = type({ a: "string" }).or({ b: "number" }).describe("an a or a b")
		attest(T({}).toString()).snap("must be an a or a b")
		attest(T(5).toString()).snap("must be an a or a b")
		const Lengths = type("string < 2 | string > 5").describe("short or long")
		attest(Lengths("abc").toString()).snap("must be short or long")
	})

	it("length stress", () => {
		// as of TS 5.1, can handle a max of 46 branches before an inifinitely
		// deep error not the end of the world if this changes slightly, but
		// wanted to make those changes explicit if something reduces it it's
		// also still very responsive up until it hits the limit, so it is
		// likely a safeguard rather than a limitation of the parser
		const T = type(
			"0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45"
		)
		// prettier-ignore
		attest<
				| 0
				| 1
				| 2
				| 3
				| 4
				| 5
				| 6
				| 7
				| 8
				| 9
				| 10
				| 11
				| 12
				| 13
				| 14
				| 15
				| 16
				| 17
				| 18
				| 19
				| 20
				| 21
				| 22
				| 23
				| 24
				| 25
				| 26
				| 27
				| 28
				| 29
				| 30
				| 31
				| 32
				| 33
				| 34
				| 35
				| 36
				| 37
				| 38
				| 39
				| 40
				| 41
				| 42
				| 43
				| 44
				| 45
			>(T.infer)

		attest(T.json).snap([
			{ unit: 0 },
			{ unit: 10 },
			{ unit: 11 },
			{ unit: 12 },
			{ unit: 13 },
			{ unit: 14 },
			{ unit: 15 },
			{ unit: 16 },
			{ unit: 17 },
			{ unit: 18 },
			{ unit: 19 },
			{ unit: 1 },
			{ unit: 20 },
			{ unit: 21 },
			{ unit: 22 },
			{ unit: 23 },
			{ unit: 24 },
			{ unit: 25 },
			{ unit: 26 },
			{ unit: 27 },
			{ unit: 28 },
			{ unit: 29 },
			{ unit: 2 },
			{ unit: 30 },
			{ unit: 31 },
			{ unit: 32 },
			{ unit: 33 },
			{ unit: 34 },
			{ unit: 35 },
			{ unit: 36 },
			{ unit: 37 },
			{ unit: 38 },
			{ unit: 39 },
			{ unit: 3 },
			{ unit: 40 },
			{ unit: 41 },
			{ unit: 42 },
			{ unit: 43 },
			{ unit: 44 },
			{ unit: 45 },
			{ unit: 4 },
			{ unit: 5 },
			{ unit: 6 },
			{ unit: 7 },
			{ unit: 8 },
			{ unit: 9 }
		])
	})

	const expected = () =>
		rootSchema([
			{
				domain: "object",
				required: {
					key: "a",
					value: { domain: "string" }
				}
			},
			{
				domain: "object",
				required: {
					key: "b",
					value: { domain: "number" }
				}
			}
		]).json

	it("tuple", () => {
		const T = type([{ a: "string" }, "|", { b: "number" }])
		attest<{ a: string } | { b: number }>(T.infer)
		attest(T.json).equals(expected())
	})

	it("root", () => {
		const T = type({ a: "string" }, "|", { b: "number" })
		attest<{ a: string } | { b: number }>(T.infer)
		attest(T.json).equals(expected())
	})

	it("chained", () => {
		const T = type({ a: "string" }).or({ b: "number" })
		attest<
			| {
					a: string
			  }
			| {
					b: number
			  }
		>(T.infer)
		attest(T.json).equals(expected())
	})

	it("root autocompletion", () => {
		// @ts-expect-error
		attest(() => type({ a: "s" }, "|", { b: "boolean" })).completions({
			s: ["string", "symbol"]
		})
		// @ts-expect-error
		attest(() => type({ a: "string" }, "|", { b: "b" })).completions({
			b: ["bigint", "boolean"]
		})
	})

	it("bad reference", () => {
		// @ts-expect-error
		attest(() => type("number|strng")).throwsAndHasTypeError(
			writeUnresolvableMessage("strng")
		)
	})

	it("consecutive tokens", () => {
		// @ts-expect-error
		attest(() => type("boolean||null")).throws(
			writeMissingRightOperandMessage("|", "|null")
		)
	})

	it("ends with |", () => {
		// @ts-expect-error
		attest(() => type("boolean|")).throws(
			writeMissingRightOperandMessage("|", "")
		)
	})

	it("long missing union member", () => {
		attest(() =>
			// @ts-expect-error
			type("boolean[]|(string|number|)|object")
		).throws(writeMissingRightOperandMessage("|", ")|object"))
	})

	it("left semantic error", () => {
		// @ts-expect-error
		attest(() => type("symbol%2|string")).throwsAndHasTypeError(
			writeIndivisibleMessage(intrinsic.symbol)
		)
	})

	it("right semantic error", () => {
		// @ts-expect-error
		attest(() => type("string|symbol%2")).throwsAndHasTypeError(
			writeIndivisibleMessage(intrinsic.symbol)
		)
	})

	it("chained bad reference", () => {
		// @ts-expect-error
		attest(() => type("string").or("nummer")).throwsAndHasTypeError(
			writeUnresolvableMessage("nummer")
		)
	})

	it("chained description", () => {
		const T = type("number|string").describe("My custom type")
		attest(T.json).snap({
			branches: [
				{ meta: "My custom type", domain: "number" },
				{ meta: "My custom type", domain: "string" }
			],
			meta: "My custom type"
		})
	})

	it("branches described like Object.prototype members", () => {
		const T = type("string")
			.describe("constructor")
			.or(type("number").describe("valueOf"))
		attest(T.description).snap("valueOf or constructor")
	})

	it("orders units by when they were registered", () => {
		const symbols = Array.from({ length: 11 }, () => Symbol("orderedUnit"))
		for (const symbol of symbols) type.unit(symbol)
		const T = type.enumerated(...[...symbols].reverse())
		attest(T.internal.branches.map(branch => branch.json)).equals(
			symbols.map(symbol => type.unit(symbol).json)
		)
	})

	it("orders strings holding $ and digits by code unit", () => {
		const T = type("'$2' | '$10' | '$ark.fn$9' | '$ark.fn$10'")
		attest(T.expression).snap('"$10" | "$2" | "$ark.fn$10" | "$ark.fn$9"')
	})

	describe("objects alike but for one key", () => {
		it("merge into the union of its values", () => {
			const T = type({ a: "string" }).or({ a: "number" })
			attest<{ a: string } | { a: number }>(T.infer)
			attest(T.json).equals(type({ a: "string | number" }).json)
		})

		it("merge a discriminant", () => {
			const T = type({ kind: "'a'", x: "string" }).or({
				kind: "'b'",
				x: "string"
			})
			attest(T.expression).snap('{ kind: "a" | "b", x: string }')
			attest(T({ x: 5 }).toString()).snap(`kind must be "a" or "b" (was missing)
x must be a string`)
		})

		it("keep branches differing in two keys", () => {
			const T = type({ kind: "'a'", x: "string" }).or({
				kind: "'b'",
				x: "number"
			})
			attest(T.expression).snap(
				'{ kind: "a", x: string } | { kind: "b", x: number }'
			)
		})

		it("keep a key only one has", () => {
			const T = type({ a: "string" }).or({ a: "number", b: "string" })
			attest(T.expression).snap("{ a: number, b: string } | { a: string }")
		})

		it("merge required and optional to optional", () => {
			const T = type({ a: "string" }).or({ "a?": "number" })
			attest(T.expression).snap("{ a?: number | string }")
			attest(T({})).equals({})
		})

		it("merge a key optional on one side among others", () => {
			const T = type({ a: "string", b: "number" }).or({
				"a?": "boolean",
				b: "number"
			})
			attest(T.expression).snap("{ b: number, a?: string | false | true }")
		})

		it("keep a default to its branch", () => {
			const T = type({ a: "string" }).or({ a: "number = 5" })
			attest(T.expression).snap("{ a: number = 5 } | { a: string }")
			attest(T({})).equals({ a: 5 })
		})

		it("merge morphs", () => {
			const T = type({ a: "string.numeric.parse" }).or({ a: "number" })
			attest(T.json).equals(type({ a: "string.numeric.parse | number" }).json)
			attest(T({ a: "5" })).equals({ a: 5 })
		})

		it("merge nested", () => {
			const T = type({ a: { b: "string" } }).or({ a: { b: "number" } })
			attest(T.expression).snap("{ a: { b: number | string } }")
		})

		it("reduce merged values", () => {
			const T = type({ a: "0 < number < 5" }).or({ a: "5 <= number < 10" })
			attest(T.expression).snap("{ a: 0 < number < 10 }")
		})

		it("merge alike undeclared keys", () => {
			const T = type({ "+": "reject", a: "string" }).or({
				"+": "reject",
				a: "number"
			})
			attest(T.expression).snap(
				"{ a: number | string, + (undeclared): reject }"
			)
		})

		it("keep differing undeclared keys", () => {
			const T = type({ "+": "reject", a: "string" }).or({ a: "number" })
			attest(T.expression).snap(
				"{ a: number } | { a: string, + (undeclared): reject }"
			)
		})

		it("keep an array and an object", () => {
			const T = type({ a: "string" }).or(type({ a: "number" }).and("string[]"))
			attest(T.expression).snap("{ a: number } & string[] | { a: string }")
		})

		it("keep ordered unions", () => {
			const T = rootSchema({
				branches: [
					{ domain: "object", required: { key: "a", value: "string" } },
					{ domain: "object", required: { key: "a", value: "number" } }
				],
				ordered: true
			})
			attest(T.expression).snap("{ a: string } | { a: number }")
		})

		it("keep differing descriptions", () => {
			const T = type({ a: "string" })
				.describe("an A")
				.or(type({ a: "number" }).describe("a B"))
			attest(T.expression).snap("{ a: number } | { a: string }")
			attest(T(5).toString()).snap("must be a B or an A")
		})

		it("merge a shared description", () => {
			const T = type({ a: "string" })
				.describe("an AB")
				.or(type({ a: "number" }).describe("an AB"))
			attest(T.expression).snap("{ a: number | string }")
			attest(T(5).toString()).snap("must be an AB")
		})
	})

	it("a chain of units is the union its parts would be", () => {
		attest(type("'a'|'b'|'c'").internal).equals(
			type("('a'|'b')|'c'").internal as never
		)
		attest(type("'c'|'a'|'b'").expression).snap('"a" | "b" | "c"')
		attest(type("'a'|'b'|'a'").expression).snap('"a" | "b"')
		attest(type("'a'|'a'").expression).snap('"a"')
		// what follows the units joins the union they make
		attest(type("'a'|'b'|string").expression).snap("string")
		attest(type("string|'a'|'b'").expression).snap("string")
		attest(type("'a'|'b'&string|1").expression).snap('"a" | "b" | 1')
		attest(type("'a'|'b'|>string").expression).snap('"a" | "b"')
		attest(type("('a'|'b')[]|'c'|'d'").expression).snap(
			'("a" | "b")[] | "c" | "d"'
		)
	})

	it("units missing their right operand", () => {
		attest(() => type("'a'|" as never)).throws(
			writeMissingRightOperandMessage("|")
		)
		attest(() => type("'a'|'b'|" as never)).throws(
			writeMissingRightOperandMessage("|")
		)
		attest(() => type("'a'||'b'" as never)).throws(
			writeMissingRightOperandMessage("|", "|'b'")
		)
	})

	it("a class's Symbol.hasInstance can allow a unit of any domain", () => {
		class Nullish {
			static [Symbol.hasInstance](data: unknown) {
				return data === null || data === undefined
			}
		}
		attest(type.instanceOf(Nullish).or("null").expression).snap("Nullish")
		attest(type.instanceOf(Nullish).or("5").expression).snap("Nullish | 5")
		attest(
			type({ a: type.instanceOf(Nullish) }).or({ a: "null" }).expression
		).snap("{ a: Nullish }")
	})

	it("a discriminant doesn't skip a predicate an earlier key tests", () => {
		const tested: unknown[] = []
		const T = type({ a: "'x'", b: "1" }).or({
			a: type("string").narrow(s => {
				tested.push(s)
				return true
			}),
			b: "2"
		})
		// a Type is built at its first read
		attest(T.expression).snap('{ a: string & fn, b: 2 } | { a: "x", b: 1 }')
		attest(tested).snap(["x"])
		attest(T({ a: "x", b: 1 })).snap({ a: "x", b: 1 })
	})

	it("an uncompiled check calls a predicate whether or not the union was discriminated", () => {
		const testedOnFirstCall = (discriminated: boolean) => {
			const tested: unknown[] = []
			const T = type({ a: "'x'", b: "1" }).or({
				a: type("string").narrow(s => {
					tested.push(s)
					return true
				}),
				b: "2"
			})
			const node = T.internal as UnionNode
			// what reads a union's references, like binding precompiled units,
			// discriminates it before its first check
			if (discriminated) void node.discriminant
			tested.length = 0
			T({ a: "x", b: 1 })
			return tested
		}
		const expected = type("string").internal.$.cfg.jitless ? [] : ["x"]
		attest(testedOnFirstCall(false)).equals(expected)
		attest(testedOnFirstCall(true)).equals(expected)
	})

	it("equal units keep one branch however they're written", () => {
		const units = (...branches: unknown[]) =>
			type.schema(branches.map(unit => ({ unit })) as never).expression
		attest(units("a", "b", "a")).snap('"a" | "b"')
		attest(units(1, 2, 1, 2)).snap("1 | 2")
		attest(units(new Date(0), new Date(0))).snap("d'1970-01-01T00:00:00.000Z'")
		// a described unit sorts after its undescribed copy, which is the one kept
		attest(
			type.schema([{ unit: "a", meta: "first" }, { unit: "a" }] as never)
				.description
		).snap('"a"')
	})

	it("does not flatten ordered prop unions during prop-group merging", () => {
		const Ordered = type.schema({
			branches: [
				{
					in: "string",
					morphs: (s: string) => s.length
				},
				"string"
			],
			ordered: true
		})
		const U = type({ k: Ordered, tag: "1" }).or({ k: "number", tag: "1" })
		attest(U({ k: "abc", tag: 1 })).equals({ k: 3, tag: 1 })
		attest(U({ k: 42, tag: 1 })).equals({ k: 42, tag: 1 })
		attest(U.allows({ k: false, tag: 1 })).equals(false)
	})

	it("preserves symbol-keyed metadata across union reduction and merging", () => {
		const sym = Symbol("meta")
		const A = type({ a: "'x'", b: "string" }).configure({
			[sym]: 1
		} as never)
		const B = type({ a: "'x'", b: "number" }).configure({
			[sym]: 2
		} as never)
		const U = A.or(B)
		// differing symbol metadata must not be merged into a single branch
		const branches = U.internal.assertIs("union").branches
		attest(branches.length).equals(2)
		attest(branches.map(b => (b.meta as any)[sym]).sort()).equals([1, 2])

		// identical symbol metadata may merge and keeps the symbol metadata
		const C = type({ a: "'x'", b: "number" }).configure({
			[sym]: 1
		} as never)
		const Merged = A.or(C)
		attest(Merged.internal.kind).equals("intersection")
		attest((Merged.meta as any)[sym]).equals(1)

		// differing symbol metadata on range branches prevents merging
		const R1 = type("0 <= number <= 5").configure({ [sym]: "lo" } as never)
		const R2 = type("5 <= number <= 10").configure({ [sym]: "hi" } as never)
		const R = R1.or(R2)
		attest(R.internal.assertIs("union").branches.length).equals(2)
	})

	it("preserves reduced node metadata on single-branch union reduction", () => {
		const S = type("string").describe("my str")
		const U = S.or(S)
		attest(U.description).equals("my str")
		attest(U.meta.description).equals("my str")

		const sym = Symbol("tag")
		const SymStr = type("string").configure({ [sym]: "keep" } as never)
		const SymU = SymStr.or(SymStr)
		attest((SymU.meta as any)[sym]).equals("keep")

		// ordered unions must keep the earlier duplicate branch rather than promoting a later undescribed copy
		const OrderedDup = type.schema({
			branches: [
				type("'a'").describe("x").internal,
				type("string").pipe(s => `g:${s}`).internal,
				type("'a'").internal
			],
			ordered: true
		})
		attest(OrderedDup("a")).equals("a")
		attest(OrderedDup("b")).equals("g:b")
	})

	it("equal branches with the same meta are that branch", () => {
		const meta = {
			description: "a name",
			message: "not a name",
			[Symbol("s")]: 1,
			custom: "x"
		}
		const Name = type("string").configure(meta as never)
		const T = Name.or(type("string").configure(meta as never))
		attest(T.internal).is(Name.internal)
		attest(T.description).snap("a name")
		attest(T(5).toString()).snap("not a name")
		attest(
			type("string")
				.label("Name")
				.or(type("string").label("Name"))(5)
				.toString()
		).snap("Name must be a string")
	})

	it("equal branches with different meta keep one's, as alongside another branch", () => {
		const X = type("string").describe("x")
		const Y = type("string").describe("y")
		attest(X.or(Y).description).snap("x")
		attest(Y.or(X).description).snap("x")
		attest(X.or(Y).or("number").description).snap("a number or x")
	})

	it("orders cyclic types by when they were defined", () => {
		// an alias's id counts those of its name, so three defined in turn can be
		// counted8, counted9 and counted10, the last before the others as text
		const k = () =>
			scope({ counted: { a: "counted", k: "true" } }).export().counted
		let K = k()
		while (!/\D9*8$/.test(K.internal.id)) K = k()
		const L = scope({ counted: { a: "counted", l: "true" } }).export().counted
		const R = scope({ counted: { a: "counted", r: "true" } }).export().counted
		const ids = [K, L, R].map(T => T.internal.id)
		attest(ids.map(id => id.length - ids[0].length)).equals([0, 0, 1])

		const T = L.array().or(R.array())
		attest(T.expression).snap(
			"{ a: $counted, l: true }[] | { a: $counted, r: true }[]"
		)
		attest(R.array().or(L.array()).expression).equals(T.expression)

		// an intersection's operands
		const intersected = {
			required: [
				{ key: "a", value: `$ark.${ids[1]}&${ids[2]}` },
				{ key: "l", value: { unit: true } },
				{ key: "r", value: { unit: true } }
			],
			domain: "object"
		}
		attest(L.and(R).json).equals(intersected)
		attest(R.and(L).json).equals(intersected)

		// intersections sharing their first operand
		const Nested = type({ v: K.and(R) }).or({ v: K.and(L) })
		attest(Nested.expression).snap(
			"{ v: { a: $counted&$counted, k: true, l: true } } | { v: { a: $counted&$counted, k: true, r: true } }"
		)

		// a name that is another's and a digit follows it, however many of
		// either were defined: as text, numbered3 is after numbered2_3
		const numbered = () => {
			const types = scope({
				numbered: { a: "numbered", l: "true" },
				numbered2: { a: "numbered2", r: "true" }
			}).export()
			return types.numbered.array().or(types.numbered2.array()).expression
		}
		const first = numbered()
		attest(first).snap(
			"{ a: $numbered, l: true }[] | { a: $numbered2, r: true }[]"
		)
		numbered()
		attest(numbered()).equals(first)

		// a name's own digits aren't a counter
		const named = scope({
			named15: { a: "named15", l: "true" },
			named9: { a: "named9", r: "true" }
		}).export()
		attest(named.named9.array().or(named.named15.array()).expression).snap(
			"{ a: $named15, l: true }[] | { a: $named9, r: true }[]"
		)

		// a string that reads as a reference is still ordered by code unit
		attest(type("'$ark.counted9' | '$ark.counted10'").expression).snap(
			'"$ark.counted10" | "$ark.counted9"'
		)
	})

	it("a predicate throwing while the union is discriminated throws at each check", () => {
		let throws = false
		const T = type({ k: "'a'", a: "1" })
			.or({ k: "'b'", a: "2" })
			.or({
				k: type("string").narrow(() => {
					if (throws) throw new Error("boom")
					return true
				}),
				z: "1"
			})
		// reducing the union calls the predicate too, so it's built first
		attest(T.expression).snap(
			'{ a: 1, k: "a" } | { a: 2, k: "b" } | { k: string & fn, z: 1 }'
		)
		throws = true
		const results = [0, 1, 2].map(() => {
			try {
				T({ k: "a", a: 1 })
				return "checked"
			} catch (e) {
				return (e as Error).message
			}
		})
		// a Type's first check can run through its branches, undiscriminated
		attest(results.slice(1)).equals(["boom", "boom"])
		throws = false
		attest(T({ k: "a", a: 1 })).snap({ k: "a", a: 1 })
	})
})

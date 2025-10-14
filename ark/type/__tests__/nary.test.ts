import { attest, contextualize } from "@ark/attest"
import type { Morph } from "@ark/schema"
import { type } from "arktype"
import type { Out } from "arktype/internal/attributes.ts"

contextualize(() => {
	contextualize.each(
		"union",
		() => {
			const $ = type.scope({
				a: "1",
				b: "2",
				c: "3",
				d: "4",
				e: "5",
				f: "6",
				g: "7",
				h: "8",
				i: "9",
				j: "10",
				k: "11",
				l: "12",
				m: "13",
				n: "14",
				o: "15",
				p: "16",
				q: "17"
			})
			return $
		},
		it => {
			it("nullary", () => {
				const T = type.or()
				attest<never>(T.t)

				attest(T.expression).snap("never")
				attest(T.$.internal.name).snap("ark")
			})

			it("unary", $ => {
				const T = $.type.or("a")
				attest<1>(T.t)
				attest(T.expression).snap("1")
			})

			it("binary", $ => {
				const T = $.type.or("a", "b")
				attest<1 | 2>(T.t)
				attest(T.expression).snap("1 | 2")
			})

			it("3-ary", $ => {
				const T = $.type.or("a", "b", "c")
				attest<1 | 2 | 3>(T.t)
				attest(T.expression).snap("1 | 2 | 3")
			})

			it("4-ary", $ => {
				const T = $.type.or("a", "b", "c", "d")
				attest<1 | 2 | 3 | 4>(T.t)
				attest(T.expression).snap("1 | 2 | 3 | 4")
			})

			it("5-ary", $ => {
				const T = $.type.or("a", "b", "c", "d", "e")
				attest<1 | 2 | 3 | 4 | 5>(T.t)
				attest(T.expression).snap("1 | 2 | 3 | 4 | 5")
			})

			it("6-ary", $ => {
				const T = $.type.or("a", "b", "c", "d", "e", "f")
				attest<1 | 2 | 3 | 4 | 5 | 6>(T.t)
				attest(T.expression).snap("1 | 2 | 3 | 4 | 5 | 6")
			})

			it("7-ary", $ => {
				const T = $.type.or("1", "2", "3", "4", "5", "6", "7")
				attest<1 | 2 | 3 | 4 | 5 | 6 | 7>(T.t)
				attest(T.expression).snap("1 | 2 | 3 | 4 | 5 | 6 | 7")
			})

			it("8-ary", $ => {
				const T = $.type.or("a", "b", "c", "d", "e", "f", "g", "h")
				attest<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(T.t)
				attest(T.expression).snap("1 | 2 | 3 | 4 | 5 | 6 | 7 | 8")
			})

			it("9-ary", $ => {
				const T = $.type.or("a", "b", "c", "d", "e", "f", "g", "h", "i")
				attest<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9>(T.t)
				attest(T.expression).snap("1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9")
			})

			it("10-ary", $ => {
				const T = $.type.or("a", "b", "c", "d", "e", "f", "g", "h", "i", "j")
				attest<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10>(T.t)
				attest(T.expression).snap("10 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9")
			})

			it("11-ary", $ => {
				const T = $.type.or(
					"a",
					"b",
					"c",
					"d",
					"e",
					"f",
					"g",
					"h",
					"i",
					"j",
					"k"
				)
				attest<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11>(T.t)
				attest(T.expression).snap("10 | 11 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9")
			})

			it("12-ary", $ => {
				const T = $.type.or(
					"a",
					"b",
					"c",
					"d",
					"e",
					"f",
					"g",
					"h",
					"i",
					"j",
					"k",
					"l"
				)
				attest<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12>(T.t)
				attest(T.expression).snap(
					"10 | 11 | 12 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9"
				)
			})

			it("13-ary", $ => {
				const T = $.type.or(
					"a",
					"b",
					"c",
					"d",
					"e",
					"f",
					"g",
					"h",
					"i",
					"j",
					"k",
					"l",
					"m"
				)
				attest<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13>(T.t)
				attest(T.expression).snap(
					"10 | 11 | 12 | 13 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9"
				)
			})

			it("14-ary", $ => {
				const T = $.type.or(
					"a",
					"b",
					"c",
					"d",
					"e",
					"f",
					"g",
					"h",
					"i",
					"j",
					"k",
					"l",
					"m",
					"n"
				)
				attest<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14>(T.t)
				attest(T.expression).snap(
					"10 | 11 | 12 | 13 | 14 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9"
				)
			})

			it("15-ary", $ => {
				const T = $.type.or(
					"a",
					"b",
					"c",
					"d",
					"e",
					"f",
					"g",
					"h",
					"i",
					"j",
					"k",
					"l",
					"m",
					"n",
					"o"
				)
				attest<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15>(
					T.t
				)
				attest(T.expression).snap(
					"10 | 11 | 12 | 13 | 14 | 15 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9"
				)
			})

			it("16-ary", $ => {
				const T = $.type.or(
					"a",
					"b",
					"c",
					"d",
					"e",
					"f",
					"g",
					"h",
					"i",
					"j",
					"k",
					"l",
					"m",
					"n",
					"o",
					"p"
				)
				attest<
					1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16
				>(T.t)
				attest(T.expression).snap(
					"10 | 11 | 12 | 13 | 14 | 15 | 16 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9"
				)
			})

			it("n-ary", $ => {
				const T = $.type.or(
					"a",
					"b",
					"c",
					"d",
					"e",
					"f",
					"g",
					"h",
					"i",
					"j",
					"k",
					"l",
					"m",
					"n",
					"o",
					"p",
					"q"
				)

				attest<
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
				>(T.t)
				attest(T.expression).snap(
					"10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9"
				)
			})

			it("completions", () => {
				// @ts-expect-error
				attest(() => type.or("boo", { foo: "big" })).completions({
					boo: ["boolean"],
					big: ["bigint"]
				})
			})

			it("spreadable", () => {
				const types: type[] = []

				const T = type.or(...types)

				attest<unknown>(T.t)
				attest(T.expression).snap("never")
			})

			it("spreadable scoped", $ => {
				const types: { key: "a" }[] = []

				const T = $.type.or(...types)

				attest<{ key: 1 }>(T.t)
			})
		}
	)

	contextualize.each(
		"intersection",
		() => {
			const $ = type.scope({
				a: { a1: "1" },
				b: { a2: "2" },
				c: { a3: "3" },
				d: { a4: "4" },
				e: { a5: "5" }
			})
			return $
		},
		it => {
			it("nullary", () => {
				const T = type.and()
				attest<unknown>(T.t)
				attest(T.expression).snap("unknown")
				attest(T.$.internal.name).snap("ark")
			})

			it("unary", $ => {
				const T = $.type.and("a")
				attest<{ a1: 1 }>(T.t)
				attest(T.expression).snap("{ a1: 1 }")
			})

			it("binary", $ => {
				const T = $.type.and("a", "b")
				attest<{ a1: 1; a2: 2 }>(T.t)
				attest(T.expression).snap("{ a1: 1, a2: 2 }")
			})

			it("3-ary", $ => {
				const T = $.type.and("a", "b", "c")
				attest<{
					a1: 1
					a2: 2
					a3: 3
				}>(T.t)
				attest(T.expression).snap("{ a1: 1, a2: 2, a3: 3 }")
			})

			it("4-ary", $ => {
				const T = $.type.and("a", "b", "c", "d")
				attest<{
					a1: 1
					a2: 2
					a3: 3
					a4: 4
				}>(T.t)
				attest(T.expression).snap("{ a1: 1, a2: 2, a3: 3, a4: 4 }")
			})

			it("5-ary", $ => {
				const T = $.type.and("a", "b", "c", "d", "e")
				attest<{
					a1: 1
					a2: 2
					a3: 3
					a4: 4
					a5: 5
				}>(T.t)
				attest(T.expression).snap("{ a1: 1, a2: 2, a3: 3, a4: 4, a5: 5 }")
			})

			// type-perf currently blows up here, investigation:
			// https://github.com/arktypeio/arktype/issues/1394

			// it("nary", () => {
			// 	const T = type.and(
			// 		{ a1: "1" },
			// 		{ a2: "2" },
			// 		{ a3: "3" },
			// 		{ a4: "4" },
			// 		{ a5: "5" },
			// 		{ a6: "6" },
			// 		{ a7: "7" },
			// 		{ a8: "8" },
			// 		{ a9: "9" },
			// 		{ a10: "10" },
			// 		{ a11: "11" },
			// 		{ a12: "12" },
			// 		{ a13: "13" },
			// 		{ a14: "14" },
			// 		{ a15: "15" },
			// 		{ a16: "16" },
			// 		{ a17: "17" }
			// 	)

			// 	attest<{
			// 		a1: 1
			// 		a2: 2
			// 		a3: 3
			// 		a4: 4
			// 		a5: 5
			// 		a6: 6
			// 		a7: 7
			// 		a8: 8
			// 		a9: 9
			// 		a10: 10
			// 		a11: 11
			// 		a12: 12
			// 		a13: 13
			// 		a14: 14
			// 		a15: 15
			// 		a16: 16
			// 		a17: 17
			// 	}>(T.t)

			// 	attest(T.expression).snap(
			// 		"{ a1: 1, a10: 10, a11: 11, a12: 12, a13: 13, a14: 14, a15: 15, a16: 16, a17: 17, a2: 2, a3: 3, a4: 4, a5: 5, a6: 6, a7: 7, a8: 8, a9: 9 }"
			// 	)
			// })

			// type-perf currently blows up here, investigation:
			// https://github.com/arktypeio/arktype/issues/1394

			// it("nary overlapping", () => {
			// 	const T = type.and(
			// 		{ a1: "1" },
			// 		{ a1: "2" },
			// 		{ a1: "3" },
			// 		{ a1: "4" },
			// 		{ a1: "5" },
			// 		{ a1: "6" },
			// 		{ a1: "7" },
			// 		{ a1: "8" },
			// 		{ a1: "9" },
			// 		{ a1: "10" },
			// 		{ a1: "11" },
			// 		{ a1: "12" },
			// 		{ a1: "13" },
			// 		{ a1: "14" },
			// 		{ a1: "15" },
			// 		{ a1: "16" },
			// 		{ a1: "17" }
			// 	)

			// 	attest<{
			// 		a1: 17
			// 	}>(T.t)

			// 	attest(T.expression).snap()
			// })

			it("completions", () => {
				// @ts-expect-error
				attest(() => type.and("boo", { foo: "big" })).completions({
					boo: ["boolean"],
					big: ["bigint"]
				})
			})

			it("spreadable", () => {
				const types: type[] = []

				const T = type.and(...types)

				attest<unknown>(T.t)
				attest(T.expression).snap("unknown")
			})

			it("spreadable n-length", $ => {
				const types: (
					| { a: { key: "1" } }
					| { "a?": { another: "1" }; "b?": "3" }
				)[] = []

				const T = $.type.and(...types)

				attest<{
					// should be required if one or branches is required
					a: {
						key: 1
						another: 1
					}
					// should be optional if all branches are optional
					b?: 3
				}>(T.t)
			})
		}
	)

	contextualize.each(
		"merge",
		() => {
			const $ = type.scope({
				a: { a1: "1" },
				b: { a2: "2" },
				c: { a3: "3" },
				d: { a4: "4" },
				e: { a5: "5" }
			})
			return $
		},
		it => {
			it("nullary", () => {
				const T = type.merge()
				attest<object>(T.t)
				attest(T.expression).snap("object")
				attest(T.$.internal.name).snap("ark")
			})

			it("unary", $ => {
				const T = $.type.merge("a")
				attest<{ a1: 1 }>(T.t)
				attest(T.expression).snap("{ a1: 1 }")
			})

			it("binary", $ => {
				const T = $.type.merge("a", "b")
				attest<{ a1: 1; a2: 2 }>(T.t)
				attest(T.expression).snap("{ a1: 1, a2: 2 }")
			})

			it("3-ary", $ => {
				const T = $.type.merge("a", "b", "c")
				attest<{
					a1: 1
					a2: 2
					a3: 3
				}>(T.t)
				attest(T.expression).snap("{ a1: 1, a2: 2, a3: 3 }")
			})

			it("4-ary", $ => {
				const T = $.type.merge("a", "b", "c", "d")
				attest<{
					a1: 1
					a2: 2
					a3: 3
					a4: 4
				}>(T.t)
				attest(T.expression).snap("{ a1: 1, a2: 2, a3: 3, a4: 4 }")
			})

			it("5-ary", $ => {
				const T = $.type.merge("a", "b", "c", "d", "e")

				attest<{
					a1: 1
					a2: 2
					a3: 3
					a4: 4
					a5: 5
				}>(T.t)
				attest(T.expression).snap("{ a1: 1, a2: 2, a3: 3, a4: 4, a5: 5 }")
			})

			it("nary", () => {
				const T = type.merge(
					{ a1: "1" },
					{ a2: "2" },
					{ a3: "3" },
					{ a4: "4" },
					{ a5: "5" },
					{ a6: "6" },
					{ a7: "7" },
					{ a8: "8" },
					{ a9: "9" },
					{ a10: "10" },
					{ a11: "11" },
					{ a12: "12" },
					{ a13: "13" },
					{ a14: "14" },
					{ a15: "15" },
					{ a16: "16" },
					{ a17: "17" }
				)

				attest<{
					a1: 1
					a2: 2
					a3: 3
					a4: 4
					a5: 5
					a6: 6
					a7: 7
					a8: 8
					a9: 9
					a10: 10
					a11: 11
					a12: 12
					a13: 13
					a14: 14
					a15: 15
					a16: 16
					a17: 17
				}>(T.t)

				attest(T.expression).snap(
					"{ a1: 1, a10: 10, a11: 11, a12: 12, a13: 13, a14: 14, a15: 15, a16: 16, a17: 17, a2: 2, a3: 3, a4: 4, a5: 5, a6: 6, a7: 7, a8: 8, a9: 9 }"
				)
			})

			// type-perf currently blows up here, investigation:
			// https://github.com/arktypeio/arktype/issues/1394

			// it("nary overlapping", () => {
			// 	const T = type.merge(
			// 		{ a1: "1" },
			// 		{ a1: "2" },
			// 		{ a1: "3" },
			// 		{ a1: "4" },
			// 		{ a1: "5" },
			// 		{ a1: "6" },
			// 		{ a1: "7" },
			// 		{ a1: "8" },
			// 		{ a1: "9" },
			// 		{ a1: "10" },
			// 		{ a1: "11" },
			// 		{ a1: "12" },
			// 		{ a1: "13" },
			// 		{ a1: "14" },
			// 		{ a1: "15" },
			// 		{ a1: "16" },
			// 		{ a1: "17" }
			// 	)

			// 	attest<{
			// 		a1: 17
			// 	}>(T.t)

			// 	attest(T.expression).snap()
			// })

			it("completions", () => {
				// @ts-expect-error
				attest(() => type.merge({ boo: "boo" }, { foo: "big" })).completions({
					big: ["bigint"],
					boo: ["boolean"]
				})
			})

			it("spreadable", () => {
				const types: type<object>[] = []

				const T = type.merge(...types)

				attest<{}>(T.t)
				attest(T.expression).snap("object")
			})

			it("spreadable scoped", $ => {
				const types: { key: "a" }[] = []

				const T = $.type.merge(...types)

				attest<{ key: { a1: 1 } }>(T.t)
			})

			it("spreadable n-length", $ => {
				const types: ({ a: "1" } | { a: "2?"; b: "3" })[] = []

				const T = $.type.merge(...types)

				attest<{
					// should be optional if one or more branches are optional
					a?: 1 | 2
					b: 3
				}>(T.t)
			})
		}
	)

	describe("pipe", () => {
		it("nullary", () => {
			const T = type.pipe()
			attest<unknown>(T.t)
			attest(T.expression).snap("unknown")
			attest(T.$.internal.name).snap("ark")
		})

		it("unary Type", () => {
			const T = type.pipe(type.string)
			attest<string>(T.t)
			attest(T.expression).snap("string")
		})

		it("unary morph", () => {
			const T = type.pipe((u: unknown) => JSON.stringify(u))
			attest<(In: unknown) => Out<string>>(T.t)
			attest(T.expression).snap("(In: unknown) => Out<unknown>")
		})

		it("binary", () => {
			const T = type.pipe(type.string, function _upper(s: string) {
				return s.toUpperCase()
			})
			attest<(In: string) => Out<string>>(T.t)
			attest(T.expression).snap("(In: string) => Out<unknown>")
		})

		it("3-ary", () => {
			const T = type.pipe(
				type.unit("a"),
				s => `${s}b` as const,
				s => `${s}c` as const
			)
			attest<"abc">(T.infer)
			attest(T("a")).equals("abc")
		})

		it("4-ary", () => {
			const T = type.pipe(
				type.unit("a"),
				s => `${s}b` as const,
				s => `${s}c` as const,
				s => `${s}d` as const
			)
			attest<"abcd">(T.infer)
			attest(T("a")).equals("abcd")
		})

		it("5-ary", () => {
			const T = type.pipe(
				type.unit("a"),
				s => `${s}b` as const,
				s => `${s}c` as const,
				s => `${s}d` as const,
				s => `${s}e` as const
			)
			attest<"abcde">(T.infer)
			attest(T("a")).equals("abcde")
		})

		it("6-ary", () => {
			const T = type.pipe(
				type.unit("a"),
				s => `${s}b` as const,
				s => `${s}c` as const,
				s => `${s}d` as const,
				s => `${s}e` as const,
				s => `${s}f` as const
			)
			attest<"abcdef">(T.infer)
			attest(T("a")).equals("abcdef")
		})

		it("7-ary", () => {
			const T = type.pipe(
				type.unit("a"),
				s => `${s}b` as const,
				s => `${s}c` as const,
				s => `${s}d` as const,
				s => `${s}e` as const,
				s => `${s}f` as const,
				s => `${s}g` as const
			)
			attest<"abcdefg">(T.infer)
			attest(T("a")).equals("abcdefg")
		})

		it("8-ary", () => {
			const T = type.pipe(
				type.unit("a"),
				s => `${s}b` as const,
				s => `${s}c` as const,
				s => `${s}d` as const,
				s => `${s}e` as const,
				s => `${s}f` as const,
				s => `${s}g` as const,
				s => `${s}h` as const
			)
			attest<"abcdefgh">(T.infer)
			attest(T("a")).equals("abcdefgh")
		})

		it("9-ary", () => {
			const T = type.pipe(
				type.unit("a"),
				s => `${s}b` as const,
				s => `${s}c` as const,
				s => `${s}d` as const,
				s => `${s}e` as const,
				s => `${s}f` as const,
				s => `${s}g` as const,
				s => `${s}h` as const,
				s => `${s}i` as const
			)
			attest<"abcdefghi">(T.infer)
			attest(T("a")).equals("abcdefghi")
		})

		it("10-ary", () => {
			const T = type.pipe(
				type.unit("a"),
				s => `${s}b` as const,
				s => `${s}c` as const,
				s => `${s}d` as const,
				s => `${s}e` as const,
				s => `${s}f` as const,
				s => `${s}g` as const,
				s => `${s}h` as const,
				s => `${s}i` as const,
				s => `${s}j` as const
			)
			attest<"abcdefghij">(T.infer)
			attest(T("a")).equals("abcdefghij")
		})

		it("11-ary", () => {
			const T = type.pipe(
				type.unit("a"),
				s => `${s}b` as const,
				s => `${s}c` as const,
				s => `${s}d` as const,
				s => `${s}e` as const,
				s => `${s}f` as const,
				s => `${s}g` as const,
				s => `${s}h` as const,
				s => `${s}i` as const,
				s => `${s}j` as const,
				s => `${s}k` as const
			)
			attest<"abcdefghijk">(T.infer)
			attest(T("a")).equals("abcdefghijk")
		})

		it("12-ary", () => {
			const T = type.pipe(
				type.unit("a"),
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
				s => `${s}l` as const
			)
			attest<"abcdefghijkl">(T.infer)
			attest(T("a")).equals("abcdefghijkl")
		})

		it("13-ary", () => {
			const T = type.pipe(
				type.unit("a"),
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
				s => `${s}m` as const
			)
			attest<"abcdefghijklm">(T.infer)
			attest(T("a")).equals("abcdefghijklm")
		})

		it("14-ary", () => {
			const T = type.pipe(
				type.unit("a"),
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
				s => `${s}n` as const
			)
			attest<"abcdefghijklmn">(T.infer)
			attest(T("a")).equals("abcdefghijklmn")
		})

		it("15-ary", () => {
			const T = type.pipe(
				type.unit("a"),
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
				s => `${s}o` as const
			)
			attest<"abcdefghijklmno">(T.infer)
			attest(T("a")).equals("abcdefghijklmno")
		})

		it("16-ary", () => {
			const T = type.pipe(
				type.unit("a"),
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
				s => `${s}p` as const
			)
			attest<"abcdefghijklmnop">(T.infer)
			attest(T("a")).equals("abcdefghijklmnop")
		})

		it("nary", () => {
			const T = type.pipe(
				type.unit("a"),
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
				s => `${s}q` as const
			)
			attest<"abcdefghijklmnopq">(T.infer)
			attest(T("a")).equals("abcdefghijklmnopq")
		})

		it("spreadable as Types", () => {
			const types: type[] = []

			const T = type.pipe(...types)

			attest<unknown>(T.t)
			attest(T.expression).snap("unknown")
		})

		it("spreadable as Morphs", () => {
			const morphs: Morph[] = []

			const T = type.pipe(...morphs)

			attest<unknown>(T.t)
			attest(T.expression).snap("unknown")
		})
	})

	it("handles base scopes correctly", () => {
		// previously errored here because after the first intersection, this was a SchemaScope
		const T = type.and({ a1: "1" }).and({ a2: "2" })

		attest(T.expression).snap("{ a1: 1, a2: 2 }")
		attest(T.$.internal.name).snap("ark")
	})
})

import { attest, contextualize } from "@ark/attest"
import type { Morph } from "@ark/schema"
import { type } from "arktype"
import type { Out } from "arktype/internal/attributes.ts"

contextualize(() => {
	describe("union", () => {
		it("nullary", () => {
			const T = type.or()
			attest<never>(T.t)

			attest(T.expression).snap("never")
			attest(T.$.internal.name).snap("ark")
		})

		it("unary", () => {
			const T = type.or("string")
			attest<string>(T.t)
			attest(T.expression).snap("string")
		})

		it("binary", () => {
			const T = type.or("string", "number")
			attest<string | number>(T.t)
			attest(T.expression).snap("number | string")
		})

		it("nary", () => {
			const T = type.or(
				"1",
				"2",
				"3",
				"4",
				"5",
				"6",
				"7",
				"8",
				"9",
				"10",
				"11",
				"12",
				"13",
				"14",
				"15",
				"16",
				"17"
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
	})

	describe("intersection", () => {
		it("nullary", () => {
			const T = type.and()
			attest<unknown>(T.t)
			attest(T.expression).snap("unknown")
			attest(T.$.internal.name).snap("ark")
		})

		it("unary", () => {
			const T = type.and("string")
			attest<string>(T.t)
			attest(T.expression).snap("string")
		})

		it("binary", () => {
			const T = type.and({ a: "string" }, { b: "number" })
			attest<{ a: string; b: number }>(T.t)
			attest(T.expression).snap("{ a: string, b: number }")
		})

		it("5-ary", () => {
			const T = type.and(
				{ a1: "1" },
				{ a2: "2" },
				{ a3: "3" },
				{ a4: "4" },
				{ a5: "5" }
			)

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

		// attest<{
		// 	a1: 1
		// 	a10: 10
		// 	a11: 11
		// 	a12: 12
		// 	a13: 13
		// 	a14: 14
		// 	a15: 15
		// 	a16: 16
		// 	a17: 17
		// 	a2: 2
		// 	a3: 3
		// 	a4: 4
		// 	a5: 5
		// 	a6: 6
		// 	a7: 7
		// 	a8: 8
		// 	a9: 9
		// }>(T.t)
		// 	attest(T.expression).snap(
		// 		"{ a1: 1, a10: 10, a11: 11, a12: 12, a13: 13, a14: 14, a15: 15, a16: 16, a17: 17, a2: 2, a3: 3, a4: 4, a5: 5, a6: 6, a7: 7, a8: 8, a9: 9 }"
		// 	)
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
	})

	describe("merge", () => {
		it("nullary", () => {
			const T = type.merge()
			attest<object>(T.t)
			attest(T.expression).snap("object")
			attest(T.$.internal.name).snap("ark")
		})

		it("unary", () => {
			const T = type.merge({ a: "string" })
			attest<{ a: string }>(T.t)
			attest(T.expression).snap("{ a: string }")
		})

		it("binary", () => {
			const T = type.merge({ a: "string" }, { b: "number" })
			attest<{ a: string; b: number }>(T.t)
			attest(T.expression).snap("{ a: string, b: number }")
		})

		it("5-ary", () => {
			const T = type.merge(
				{ a1: "1" },
				{ a2: "2" },
				{ a3: "3" },
				{ a4: "4" },
				{ a5: "5" }
			)

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
		// 	const T = type.merge(
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
	})

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

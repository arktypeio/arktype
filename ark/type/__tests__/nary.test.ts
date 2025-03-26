import { attest, contextualize } from "@ark/attest"
import type { Morph } from "@ark/schema"
import { type } from "arktype"
import type { Out } from "arktype/internal/attributes.ts"

contextualize(() => {
	describe("union", () => {
		it("nullary", () => {
			const t = type.or()
			attest<never>(t.t)

			attest(t.expression).snap("never")
			attest(t.$.internal.name).snap("ark")
		})

		it("unary", () => {
			const t = type.or("string")
			attest<string>(t.t)
			attest(t.expression).snap("string")
		})

		it("binary", () => {
			const t = type.or("string", "number")
			attest<string | number>(t.t)
			attest(t.expression).snap("number | string")
		})

		it("nary", () => {
			const t = type.or(
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
			>(t.t)
			attest(t.expression).snap(
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

			const t = type.or(...types)

			attest<unknown>(t.t)
			attest(t.expression).snap("never")
		})
	})

	describe("intersection", () => {
		it("nullary", () => {
			const t = type.and()
			attest<unknown>(t.t)
			attest(t.expression).snap("unknown")
			attest(t.$.internal.name).snap("ark")
		})

		it("unary", () => {
			const t = type.and("string")
			attest<string>(t.t)
			attest(t.expression).snap("string")
		})

		it("binary", () => {
			const t = type.and({ a: "string" }, { b: "number" })
			attest<{ a: string } & { b: number }>(t.t)
			attest(t.expression).snap("{ a: string, b: number }")
		})

		it("5-ary", () => {
			const t = type.and(
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
			}>(t.t)
			attest(t.expression).snap("{ a1: 1, a2: 2, a3: 3, a4: 4, a5: 5 }")
		})

		// type-perf currently blows up here, investigation:
		// https://github.com/arktypeio/arktype/issues/1394

		// it("nary", () => {
		// 	const t = type.and(
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
		// }>(t.t)
		// 	attest(t.expression).snap(
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

			const t = type.and(...types)

			attest<unknown>(t.t)
			attest(t.expression).snap("unknown")
		})
	})

	describe("merge", () => {
		it("nullary", () => {
			const t = type.merge()
			attest<object>(t.t)
			attest(t.expression).snap("object")
			attest(t.$.internal.name).snap("ark")
		})

		it("unary", () => {
			const t = type.merge({ a: "string" })
			attest<{ a: string }>(t.t)
			attest(t.expression).snap("{ a: string }")
		})

		it("binary", () => {
			const t = type.merge({ a: "string" }, { b: "number" })
			attest<{ a: string; b: number }>(t.t)
			attest(t.expression).snap("{ a: string, b: number }")
		})

		it("5-ary", () => {
			const t = type.merge(
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
			}>(t.t)
			attest(t.expression).snap("{ a1: 1, a2: 2, a3: 3, a4: 4, a5: 5 }")
		})

		// type-perf currently blows up here, investigation:
		// https://github.com/arktypeio/arktype/issues/1394

		// it("nary", () => {
		// 	const t = type.merge(
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
		// 	}>(t.t)
		// 	attest(t.expression).snap()
		// })

		it("completions", () => {
			// @ts-expect-error
			attest(() => type.merge("boo", { foo: "big" })).completions({
				boo: ["object"]
			})
		})

		it("spreadable", () => {
			const types: type<object>[] = []

			const t = type.merge(...types)

			attest<{}>(t.t)
			attest(t.expression).snap("object")
		})
	})

	describe("pipe", () => {
		it("nullary", () => {
			const t = type.pipe()
			attest<unknown>(t.t)
			attest(t.expression).snap("unknown")
			attest(t.$.internal.name).snap("ark")
		})

		it("unary Type", () => {
			const t = type.pipe(type.string)
			attest<string>(t.t)
			attest(t.expression).snap("string")
		})

		it("unary morph", () => {
			const t = type.pipe((u: unknown) => JSON.stringify(u))
			attest<(In: unknown) => Out<string>>(t.t)
			attest(t.expression).snap("(In: unknown) => Out<unknown>")
		})

		it("binary", () => {
			const t = type.pipe(type.string, function _upper(s: string) {
				return s.toUpperCase()
			})
			attest<(In: string) => Out<string>>(t.t)
			attest(t.expression).snap("(In: string) => Out<unknown>")
		})

		it("nary", () => {
			const t = type.pipe(
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
			attest<"abcdefghijklmnopq">(t.infer)
			attest(t("a")).equals("abcdefghijklmnopq")
		})

		it("spreadable as Types", () => {
			const types: type[] = []

			const t = type.pipe(...types)

			attest<unknown>(t.t)
			attest(t.expression).snap("unknown")
		})

		it("spreadable as Morphs", () => {
			const morphs: Morph[] = []

			const t = type.pipe(...morphs)

			attest<unknown>(t.t)
			attest(t.expression).snap("unknown")
		})
	})

	it("handles base scopes correctly", () => {
		// previously errored here because after the first intersection, this was a SchemaScope
		const t = type.and({ a1: "1" }).and({ a2: "2" })

		attest(t.expression).snap("{ a1: 1, a2: 2 }")
		attest(t.$.internal.name).snap("ark")
	})
})

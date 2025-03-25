import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	describe("union", () => {
		it("nullary", () => {
			const t = type.or()
			attest<never>(t.t)
			attest(t.expression).snap("never")
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
})

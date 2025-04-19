import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("0 params implicit return", () => {
		const f = type.fn()(() => 5)
		attest<() => number>(f)
		attest(f()).equals(5)
	})

	it("0 params explicit return", () => {
		const f = type.fn(":", "5")(() => 5)
		attest<() => 5>(f)
		attest(f()).equals(5)
	})

	it("1 param implicit return", () => {
		const len = type.fn("string | unknown[]")(s => s.length)
		attest<(s: string) => number>(len)

		attest(len("foo")).equals(3)
		// @ts-expect-error
		attest(() => len(1)).throws.snap(
			"TraversalError: must be a string or an object (was a number)"
		)
	})

	it("1 param explicit return", () => {
		const len = type.fn("string | unknown[]", ":", "number")(s => s.length)
		attest<(s: string) => number>(len)

		attest(len("foo")).equals(3)

		// @ts-expect-error
		attest(() => len(1)).throws.snap(
			"TraversalError: must be a string or an object (was a number)"
		)
	})

	it("2 params implicit return", () => {
		const isNumericEquivalent = type.fn(
			"string",
			"number"
		)((s, n) => s === `${n}`)
		attest<(s: string, n: number) => boolean>(isNumericEquivalent)
		attest(isNumericEquivalent("5", 5)).equals(true)
	})

	it("2 params explicit return", () => {
		const isNumericEquivalent = type.fn(
			"string",
			"number",
			":",
			"boolean"
		)((s, n) => s === `${n}`)

		attest<(s: string, n: number) => boolean>(isNumericEquivalent)

		attest(isNumericEquivalent("5", 5)).equals(true)
	})

	it("nary", () => {
		const f = type.fn(
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
			":",
			{ a11: "11" }
		)((a, b, c, d, e, f, g, h, i, j) => ({
			...a,
			...b,
			...c,
			...d,
			...e,
			...f,
			...g,
			...h,
			...i,
			...j,
			a11: 11
		}))

		attest(f).type.toString.snap()
	})

	it("missing return", () => {
		attest(() => type.fn("string", ":"))
	})

	it("name", () => {
		const f = type.fn("string")(function originalName() {})
		attest(f.name).snap("bound typed originalName")
	})

	describe("scoped", () => {
		it("scoped param and return", () => {
			const $ = type.scope({
				xxx: "string",
				zzz: "number"
			})

			const f = $.type.fn("xxx", ":", "zzz")(s => s.length)

			attest<(s: string) => number>(f)
			attest(f("foo")).equals(3)

			// @ts-expect-error
			attest(() => f(null))
				.throws.snap("TraversalError: must be a string (was null)")
				.type.errors.snap()
		})

		it("completions", () => {
			const $ = type.scope({
				xxx: "string",
				zzz: "number"
			})

			// @ts-expect-error
			attest(() => $.type.fn("zz", ":", "xx")).completions()
		})
	})
})

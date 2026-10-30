import { attest, contextualize } from "@ark/attest"
import { registeredReference } from "@ark/schema"
import { printable } from "@ark/util"
import { scope, type } from "arktype"
import { writeInvalidLimitMessage } from "arktype/internal/parser/shift/operator/bounds.ts"

contextualize(() => {
	describe("tuple expression", () => {
		it("literal", () => {
			const T = type(["===", 5])
			attest<5>(T.infer)
			attest(T.json).equals(type("5").json)
		})

		it("symbol with description", () => {
			// if another symbol with the description "ism" is used in a test,
			// the snapshotted errors below could break, but I want to test the
			// actual display format.
			// if you're here for that reason, choose another symbol name :P
			const ism = Symbol("ism")
			const T = type(["===", ism])
			attest(T(ism)).equals(ism)

			// same with ick- don't use it
			const ick = Symbol("ick")

			attest(T(ick).toString()).snap("must be Symbol(ism) (was Symbol(ick))")
		})

		it("anonymous symbol", () => {
			const anon = Symbol()
			// An anonymous symbol will definitely have a suffix so we need to
			// get the name ahead of time
			const anonName = printable(anon)
			const T = type(["===", anon])
			attest<typeof anon>(T.infer)
			attest(T(anon)).equals(anon)
			attest(T("test").toString()).equals(`must be ${anonName} (was "test")`)
		})

		it("branches", () => {
			const o = { ark: true }
			const oReference = registeredReference(o)
			const s = Symbol()
			const sReference = registeredReference(s)
			const T = type(["===", true, "foo", 5, 1n, null, undefined, o, s])
			attest<
				true | "foo" | 5 | 1n | null | undefined | { ark: boolean } | typeof s
			>(T.infer)
			attest(T.json).equals([
				{ unit: oReference },
				{ unit: sReference },
				{ unit: "1n" },
				{ unit: "foo" },
				{ unit: "undefined" },
				{ unit: 5 },
				{ unit: null },
				{ unit: true }
			])
		})
	})

	it("number String writes with an exponent", () => {
		const T = type.unit(1e21)
		attest(T.expression).snap("1000000000000000000000")
		attest(type.raw(T.expression).json).equals(T.json)
	})

	it("prints an object unit without calling its code", () => {
		let calls = 0
		const o = {
			a: 1,
			get b() {
				return ++calls
			},
			toJSON: () => ++calls
		}
		const T = type.unit(o)
		attest(T.expression).snap(
			'{"a":1,"b":"(getter)","toJSON":"Function(toJSON)"}'
		)
		attest(T({}).toString()).snap(
			'must be {"a":1,"b":"(getter)","toJSON":"Function(toJSON)"} (was an object)'
		)
		const { U } = scope(
			{ U: [{ k: ["===", o] }, "|", { k: "'b'", v: "number" }] },
			{ jitless: true }
		).export()
		attest(U({ k: "c" }).toString()).snap(
			'k must be {"a":1,"b":"(getter)","toJSON":"Function(toJSON)"} or "b" (was "c")'
		)
		attest(calls).equals(0)
	})

	describe("root expression", () => {
		it("single", () => {
			const T = type("===", true)
			attest<true>(T.infer)
			attest(T.json).equals(type("true").json)
		})

		it("branches", () => {
			const o = { ark: true }
			const oReference = registeredReference(o)
			const s = Symbol()
			const sReference = registeredReference(s)
			const T = type("===", "foo", 5, true, null, 1n, undefined, o, s)
			attest<
				true | "foo" | 5 | 1n | null | undefined | { ark: boolean } | typeof s
			>(T.infer)
			attest(T.json).equals([
				{ unit: oReference },
				{ unit: sReference },
				{ unit: "1n" },
				{ unit: "foo" },
				{ unit: "undefined" },
				{ unit: 5 },
				{ unit: null },
				{ unit: true }
			])
		})
	})

	describe("non-finite number", () => {
		it("NaN", () => {
			const T = type("NaN")
			attest<number>(T.infer)
			attest(T.json).equals(type.keywords.number.NaN.json)
			attest(T.expression).snap("NaN")
			attest(T(Number.NaN)).equals(Number.NaN)
			attest(T(0).toString()).snap("must be NaN (was 0)")
		})

		it("Infinity and -Infinity", () => {
			const T = type("Infinity | -Infinity")
			attest<number>(T.infer)
			attest(T.expression).snap("-Infinity | Infinity")
			attest(T(Number.POSITIVE_INFINITY)).equals(Number.POSITIVE_INFINITY)
			attest(T(Number.NEGATIVE_INFINITY)).equals(Number.NEGATIVE_INFINITY)
			attest(T(1e308).toString()).snap(
				"must be -Infinity or Infinity (was 1e+308)"
			)
		})

		it("is not a limit", () => {
			// @ts-expect-error
			attest(() => type("number>Infinity")).throwsAndHasTypeError(
				writeInvalidLimitMessage(">", "Infinity", "right")
			)
			// @ts-expect-error
			attest(() => type("Infinity<number")).throwsAndHasTypeError(
				writeInvalidLimitMessage("<", "number", "right")
			)
		})
	})
})

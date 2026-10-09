import { attest, contextualize } from "@ark/attest"
import { registeredReference } from "@ark/schema"
import { printable } from "@ark/util"
import { type } from "arktype"

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
})

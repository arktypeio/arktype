import { attest } from "@arktype/attest"
import { node } from "@arktype/schema"
import { type } from "arktype"
import { suite, test } from "mocha"

suite("literal", () => {
	suite("tuple expression", () => {
		test("literal", () => {
			const t = type(["===", 5])
			attest<5>(t.infer)
			attest(t.condition).equals(type("5").condition)
		})
		test("non-serializable", () => {
			const s = Symbol()
			const t = type(["===", s])
			attest<symbol>(t.infer)
			attest(t(s).data).equals(s)
			attest(t("test").problems?.summary).snap(
				'Must be (symbol anonymous) (was "test")'
			)
		})
		test("branches", () => {
			const o = { ark: true }
			const s = Symbol()
			const t = type(["===", true, "foo", 5, 1n, null, undefined, o, s])
			attest<
				true | "foo" | 5 | 1n | null | undefined | { ark: boolean } | typeof s
			>(t.infer)
			attest(t.condition).equals(
				node.units(true, "foo", 5, 1n, null, undefined, o, s).condition
			)
		})
	})
	suite("root expression", () => {
		test("single", () => {
			const t = type("===", true)
			attest<true>(t.infer)
			attest(t.condition).equals(type("true").condition)
		})
		test("branches", () => {
			const o = { ark: true }
			const s = Symbol()
			const t = type("===", "foo", 5, true, null, 1n, undefined, o, s)
			attest<
				true | "foo" | 5 | 1n | null | undefined | { ark: boolean } | typeof s
			>(t.infer)
			attest(t.condition).equals(
				node.units(true, "foo", 5, 1n, null, undefined, o, s).condition
			)
		})
	})
})

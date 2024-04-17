import { attest } from "@arktype/attest"
import { reference } from "@arktype/util"
import { type } from "arktype"

describe("tuple expression", () => {
	it("literal", () => {
		const t = type(["===", 5])
		attest<5>(t.infer)
		attest(t.json).equals(type("5").json)
	})

	it("non-serializable", () => {
		const s = Symbol()
		const t = type(["===", s])
		attest<symbol>(t.infer)
		attest(t(s).out).equals(s)
		attest(t("test").errors?.summary).snap(
			'must be (symbol anonymous) (was "test")'
		)
	})

	it("branches", () => {
		const o = { ark: true }
		const oReference = reference(o)
		const s = Symbol()
		const sReference = reference(s)
		const t = type(["===", true, "foo", 5, 1n, null, undefined, o, s])
		attest<
			true | "foo" | 5 | 1n | null | undefined | { ark: boolean } | typeof s
		>(t.infer)
		attest(t.json).equals([
			{ unit: sReference },
			{ unit: oReference },
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
		const t = type("===", true)
		attest<true>(t.infer)
		attest(t.json).equals(type("true").json)
	})

	it("branches", () => {
		const o = { ark: true }
		const oReference = reference(o)
		const s = Symbol()
		const sReference = reference(s)
		const t = type("===", "foo", 5, true, null, 1n, undefined, o, s)
		attest<
			true | "foo" | 5 | 1n | null | undefined | { ark: boolean } | typeof s
		>(t.infer)
		attest(t.json).equals([
			{ unit: sReference },
			{ unit: oReference },
			{ unit: "1n" },
			{ unit: "foo" },
			{ unit: "undefined" },
			{ unit: 5 },
			{ unit: null },
			{ unit: true }
		])
	})
})

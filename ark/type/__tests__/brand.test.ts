import { attest, contextualize } from "@ark/attest"
import type { Brand, Json } from "@ark/util"
import { type } from "arktype"

contextualize(() => {
	it("fluent", () => {
		const t = type("string").brand("foo")
		attest(t.t).type.toString.snap('Brand<string, "foo">')
		attest<Brand<string, "foo">>(t.infer)
		attest<string>(t.inferIn)

		// no effect at runtime
		attest(t.expression).equals("string")

		const out = t("moo")
		attest<Brand<string, "foo"> | type.errors>(out)
	})

	it("string", () => {
		const t = type("number#cool")
		attest(t.t).type.toString.snap('Brand<number, "cool">')
		attest<Brand<number, "cool">>(t.infer)
		attest<number>(t.inferIn)

		attest(t.expression).equals("number")

		const out = t(5)
		attest<Brand<number, "cool"> | type.errors>(out)
	})

	it("in object", () => {
		const t = type({
			foo: "string#foo",
			bar: "string.json.parse#json"
		})

		attest(t.t).type.toString.snap(`{
    foo: Brand<string, "foo">
    bar: (In: string) => To<Brand<Json, "json">>
}`)
		attest<{
			foo: Brand<string, "foo">
			bar: Brand<Json, "json">
		}>(t.infer)
		attest<{
			foo: string
			bar: string
		}>(t.inferIn)
	})

	it("in union", () => {
		const t = type("string#foo | boolean")

		attest(t.t).type.toString.snap(`boolean | Brand<string, "foo">`)
		attest<boolean | Brand<string, "foo">>(t.infer)
		attest<boolean | string>(t.inferIn)
	})

	it("from morph", () => {
		const fluent = type("string.numeric.parse").brand("num")

		attest(fluent.t).type.toString.snap(
			'(In: string) => To<Brand<number, "num">>'
		)
		attest<Brand<number, "num">>(fluent.infer)
		attest<string>(fluent.inferIn)

		const string = type("string.numeric.parse#num")

		attest(string.json).equals(fluent.json)
		attest<typeof fluent.t>(string.t)
	})
})

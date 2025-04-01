import { attest, contextualize } from "@ark/attest"
import type { Brand, Json } from "@ark/util"
import { type } from "arktype"

contextualize(() => {
	it("fluent", () => {
		const T = type("string").brand("foo")
		attest(T.t).type.toString.snap('Brand<string, "foo">')
		attest<Brand<string, "foo">>(T.infer)
		attest<string>(T.inferIn)

		// no effect at runtime
		attest(T.expression).equals("string")

		const out = T("moo")
		attest<Brand<string, "foo"> | type.errors>(out)
	})

	it("string", () => {
		const T = type("number#cool")
		attest(T.t).type.toString.snap('Brand<number, "cool">')
		attest<Brand<number, "cool">>(T.infer)
		attest<number>(T.inferIn)

		attest(T.expression).equals("number")

		const out = T(5)
		attest<Brand<number, "cool"> | type.errors>(out)
	})

	it("in object", () => {
		const T = type({
			foo: "string#foo",
			bar: "string.json.parse#json"
		})

		attest(T.t).type.toString.snap(`{
	foo: Brand<string, "foo">
	bar: (In: string) => To<Brand<Json, "json">>
}`)
		attest<{
			foo: Brand<string, "foo">
			bar: Brand<Json, "json">
		}>(T.infer)
		attest<{
			foo: string
			bar: string
		}>(T.inferIn)
	})

	it("in union", () => {
		const T = type("string#foo | boolean")

		attest(T.t).type.toString.snap(`boolean | Brand<string, "foo">`)
		attest<boolean | Brand<string, "foo">>(T.infer)
		attest<boolean | string>(T.inferIn)
	})

	it("from morph", () => {
		const Fluent = type("string.numeric.parse").brand("num")

		attest(Fluent.t).type.toString.snap(
			'(In: string) => To<Brand<number, "num">>'
		)
		attest<Brand<number, "num">>(Fluent.infer)
		attest<string>(Fluent.inferIn)

		const String = type("string.numeric.parse#num")

		attest(String.json).equals(Fluent.json)
		attest<typeof Fluent.t>(String.t)
	})

	it("docs example", () => {
		const Fluent = type.number.divisibleBy(2).brand("even")

		attest<Brand<number, "even">>(Fluent.t)
		attest<number>(Fluent.inferIn)
		attest<Brand<number, "even">>(Fluent.infer)

		const String = type("(number % 2)#even")
		attest<typeof Fluent>(String).is(Fluent)
	})
})

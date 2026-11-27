import { attest, contextualize } from "@ark/attest"
import { type, type Brand, type Json } from "arktype"

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

	it("name with !", () => {
		const T = type("string#a!b")
		attest<Brand<string, "a!b">>(T.infer)
		attest(T.expression).equals("string")
	})

	it("followed by !=", () => {
		const T = type("number#id!=0")
		attest<Brand<number, "id">>(T.infer)
		attest(T.json).equals(type("number<0|number>0").json)
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

	it("preserves variant methods on branded types", () => {
		const Id = type("string#Id").atLeastLength(1)
		attest<Brand<string, "Id">>(Id.infer)
		attest<string>(Id.inferIn)
		attest<Brand<string, "Id">>(Id.assert("abc"))
		attest(Id("abc") as unknown).equals("abc")
		attest(Id("").toString()).snap("must be non-empty")

		// as a pattern intersected in a definition is
		const A = type("string#id").matching("^a")
		const Expected = type("string#id & /^a/")
		attest<typeof Expected.t>(A.t)
		attest(A.expression).snap("/^a/")

		const Cents = type("number#Cents").moreThan(0)
		attest<Brand<number, "Cents">>(Cents.infer)
		attest<number>(Cents.inferIn)
		attest<Brand<number, "Cents">>(Cents.assert(5))
		attest(Cents(5) as unknown).equals(5)
		attest(Cents(0).toString()).snap("must be positive")

		const Tags = type("string[]#Tags").atLeastLength(1)
		attest<Brand<string[], "Tags">>(Tags.infer)
		attest<Brand<string[], "Tags">>(Tags.assert(["a"]))
		attest(Tags(["a"]) as unknown).equals(["a"])
		attest(Tags([]).toString()).snap("must be non-empty")

		const Created = type("Date#Created").atOrAfter(new Date(0))
		attest<Brand<Date, "Created">>(Created.infer)

		const User = type({ id: "string", name: "string" }).brand("User")
		attest<{ id: string }>(User.pick("id").infer)

		// branded non-string/number primitives and branded primitive unions resolve to BaseType, not ObjectType
		const Flag = type("boolean#Flag")
		attest<Brand<true, "Flag"> | Brand<false, "Flag">>(Flag.infer)
		// @ts-expect-error
		attest(() => Flag.pick).type.errors("Property 'pick' does not exist")

		const Amt = type("bigint#Amt")
		attest<Brand<bigint, "Amt">>(Amt.infer)
		// @ts-expect-error
		attest(() => Amt.pick).type.errors("Property 'pick' does not exist")

		const IdOrCents = type("string#Id | number#Cents")
		attest<Brand<string, "Id"> | Brand<number, "Cents">>(IdOrCents.infer)
		// @ts-expect-error
		attest(() => IdOrCents.pick).type.errors("Property 'pick' does not exist")
	})
})

import { attest, contextualize } from "@ark/attest"
import { type, type Brand, type Json, type Type } from "arktype"

const acceptObject = (t: Type<object>) => t

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

	it("branded primitive keeps its constraint methods and brand", () => {
		const Id = type("string#id").atLeastLength(1)
		attest<Brand<string, "id">>(Id.t)
		attest(Id.expression).snap("string >= 1")

		const Cents = type("number").brand("cents").moreThan(0)
		attest<Brand<number, "cents">>(Cents.t)
		attest(Cents.expression).snap("number > 0")

		// as a pattern intersected in a definition is
		const A = type("string#id").matching("^a")
		const Expected = type("string#id & /^a/")
		attest<typeof Expected.t>(A.t)
		attest(A.expression).snap("/^a/")
	})

	it("branded primitive isn't an object", () => {
		const Id = type("string#id")
		// @ts-expect-error
		attest(() => acceptObject(Id)).type.errors(
			"is missing the following properties from type 'Type<object, {}>'"
		)
		// @ts-expect-error
		attest(() => Id.pick).type.errors("Property 'pick' does not exist")

		const Flag = type("boolean#flag")
		attest<Brand<false, "flag"> | Brand<true, "flag">>(Flag.t)
		// @ts-expect-error
		attest(() => acceptObject(Flag)).type.errors(
			"is missing the following properties from type 'Type<object, {}>'"
		)
		// @ts-expect-error
		attest(() => Flag.pick).type.errors("Property 'pick' does not exist")

		const Big = type("bigint").brand("big")
		attest<Brand<bigint, "big">>(Big.t)
		// @ts-expect-error
		attest(() => acceptObject(Big)).type.errors(
			"is missing the following properties from type 'Type<object, {}>'"
		)
		// @ts-expect-error
		attest(() => Big.pick).type.errors("Property 'pick' does not exist")
	})

	it("union of branded primitives isn't an object", () => {
		const T = type("string#a | number#b")
		attest<Brand<string, "a"> | Brand<number, "b">>(T.t)
		// @ts-expect-error
		attest(() => acceptObject(T)).type.errors(
			"is missing the following properties from type 'Type<object, {}>'"
		)
		// @ts-expect-error
		attest(() => T.pick).type.errors("Property 'pick' does not exist")
	})

	it("union of a branded primitive and an object isn't an object", () => {
		const T = type("string#id | string[]")
		// @ts-expect-error
		attest(() => acceptObject(T)).type.errors(
			"is missing the following properties from type 'Type<object, {}>'"
		)
	})

	it("branded object is an object", () => {
		const T = type({ a: "string", b: "number" }).brand("ab")
		acceptObject(T)
		attest(T.pick("a").expression).snap("{ a: string }")
	})

	it("branded object keeps its constraint methods and brand", () => {
		const Tags = type("string[]#tags").atLeastLength(1)
		attest<Brand<string[], "tags">>(Tags.t)
		attest(Tags.expression).snap("string[] >= 1")

		const Since = type("Date#since").laterThan(new Date(0))
		attest<Brand<Date, "since">>(Since.t)
	})

	it("intersection brands what its base intersects to", () => {
		const Ab = type("string#id").and("'a' | 'b'")
		attest<Brand<"a", "id"> | Brand<"b", "id">>(Ab.t)
		attest<"a" | "b">(Ab.inferIn)
		attest<typeof Ab.t>(type("('a' | 'b') & string#id").t)

		const Pair = type({ a: "string" }).brand("pair").and({ b: "number" })
		attest<Brand<{ a: string; b: number }, "pair">>(Pair.t)
		attest<{ a: string; b: number }>(Pair.inferIn)
		attest(Pair.expression).snap("{ a: string, b: number }")
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

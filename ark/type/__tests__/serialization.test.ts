import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"
import { scope, type } from "arktype"

contextualize(() => {
	it("built-in prototypes", () => {
		const A = type({
			age: "number"
		})

		const B = type({
			ages: A.array()
		})

		const C = rootSchema(B.json as never)

		attest(B.json).equals(C.json)
	})

	it("NaN and 'NaN' units hash apart", () => {
		const $ = scope({})
		$.type.unit(NaN)
		attest($.type("'NaN'").allows("NaN")).equals(true)
	})

	it("infinite and string defaults hash apart", () => {
		const $ = scope({})
		$.type({ a: ["unknown", "=", Infinity] })
		attest($.type({ a: ["unknown", "=", "Infinity"] })({})).equals({
			a: "Infinity"
		})
	})

	it("negative zero defaults hash apart", () => {
		const $ = scope({})
		$.type({ a: ["number", "=", -0] })
		const out = $.type({ a: ["number", "=", 0] }).assert({})
		attest(Object.is(out.a, 0)).equals(true)
		const unit = $.type.unit(-0).internal.assertHasKind("unit").unit
		attest(Object.is(unit, 0)).equals(true)
	})

	it("Date and ISO string units hash apart", () => {
		const $ = scope({})
		$.type.unit(new Date(0))
		const iso = "1970-01-01T00:00:00.000Z"
		attest($.type.unit(iso).allows(iso)).equals(true)
	})

	it("bigint and string values hash apart", () => {
		const $ = scope({})
		$.type.unit(5n)
		attest($.type.unit("5n").allows("5n")).equals(true)
		$.type({ a: ["unknown", "=", 5n] })
		attest($.type({ a: ["unknown", "=", "5n"] })({})).equals({ a: "5n" })
	})

	it("undefined and 'undefined' units hash apart", () => {
		const $ = scope({})
		$.type.unit(undefined)
		attest($.type("'undefined'").allows("undefined")).equals(true)
	})

	it("symbol units and registry names hash apart", () => {
		const $ = scope({})
		const T = $.type.unit(Symbol("hashedApart"))
		const name = T.json as { unit: string }
		attest($.type.unit(name.unit).allows(name.unit)).equals(true)
	})

	it("examples hash apart", () => {
		const $ = scope({})
		$.type("number").configure({ examples: [NaN] })
		attest(
			$.type("number").configure({ examples: [null] }).meta.examples
		).equals([null])
		attest($.type("bigint").configure({ examples: [5n] }).meta.examples).equals(
			[5n]
		)
	})

	it("number and string defaults hash apart", () => {
		const $ = scope({}, { jitless: true })
		$.type({ a: ["string | number", "=", 5] })
		attest($.type({ a: ["string | number", "=", "5"] })({})).equals({ a: "5" })
		$.type(["string | number", ["string | number", "=", 5]])
		attest(
			$.type(["string | number", ["string | number", "=", "5"]])(["a"])
		).equals(["a", "5"])
	})
})

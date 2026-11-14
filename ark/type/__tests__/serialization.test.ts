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

	// each pair serializes alike, so a hash that doesn't tell them apart reuses the first's node
	it("values that serialize alike hash apart", () => {
		const $ = scope({})
		$.type.unit(NaN)
		attest($.type("'NaN'").allows("NaN")).equals(true)
		$.type({ a: ["unknown", "=", Infinity] })
		attest($.type({ a: ["unknown", "=", "Infinity"] })({})).equals({
			a: "Infinity"
		})
		$.type({ a: ["number", "=", -0] })
		attest(Object.is($.type({ a: ["number", "=", 0] }).assert({}).a, 0)).equals(
			true
		)
		const zero = $.type.unit(-0).internal.assertIs("unit").unit
		attest(Object.is(zero, 0)).equals(true)
		$.type.unit(new Date(0))
		const iso = "1970-01-01T00:00:00.000Z"
		attest($.type.unit(iso).allows(iso)).equals(true)
		$.type.unit(5n)
		attest($.type.unit("5n").allows("5n")).equals(true)
		$.type.unit(undefined)
		attest($.type("'undefined'").allows("undefined")).equals(true)
		const name = ($.type.unit(Symbol("hashedApart")).json as { unit: string })
			.unit
		attest($.type.unit(name).allows(name)).equals(true)
		$.type("number").configure({ examples: [NaN] })
		attest(
			$.type("number").configure({ examples: [null] }).meta.examples
		).equals([null])
		const jitless = scope({}, { jitless: true })
		jitless.type({ a: ["string | number", "=", 5] })
		attest(jitless.type({ a: ["string | number", "=", "5"] })({})).equals({
			a: "5"
		})
	})
})

import { attest, contextualize } from "@ark/attest"
import type { Json } from "@ark/util"
import { keywords, type } from "arktype"
import type { To } from "arktype/internal/attributes.ts"

contextualize(() => {
	it("Function", () => {
		// should not be treated as a morph
		attest<Function>(type("Function").infer)
	})

	it("Date", () => {
		// should not expand built-in classes
		attest(type("Date").infer).type.toString.snap("Date")
	})

	describe("json", () => {
		it("root", () => {
			const Json = type("object.json")

			attest<Json>(Json.t)
			attest<Json>(Json.infer)
			attest<Json>(Json.inferIn)

			attest(Json({})).equals({})
			attest(Json([])).equals([])
			attest(Json(5)?.toString()).snap("must be an object (was a number)")
			attest(Json({ foo: [5n] })?.toString()).snap(
				'foo["0"] must be an object (was a bigint)'
			)
		})

		it("stringify", () => {
			const stringify = type("object.json.stringify")

			const out = stringify.assert({ foo: "bar" })

			attest<string>(out).snap('{"foo":"bar"}')

			// this error kind of sucks, should have more discriminant context
			attest(stringify({ foo: undefined }).toString()).snap(
				"foo must be an object (was undefined)"
			)

			// has declared out
			attest<string>(stringify.out.t)
			attest(stringify.out.expression).snap("string")
		})
	})

	describe("liftArray", () => {
		it("parsed", () => {
			const liftNumberArray = type("Array.liftFrom<number>")

			attest<(In: number | number[]) => To<number[]>>(liftNumberArray.t)

			attest(liftNumberArray(5)).equals([5])
			attest(liftNumberArray([5])).equals([5])
			attest(liftNumberArray("five").toString()).snap(
				"must be a number or an object (was a string)"
			)
			attest(liftNumberArray(["five"]).toString()).snap(
				"value at [0] must be a number (was a string)"
			)
		})

		it("invoked", () => {
			const T = keywords.Array.liftFrom({ data: "number" })

			attest(T.t).type.toString.snap(`(
	In: { data: number } | { data: number }[]
) => To<{ data: number }[]>`)
			attest(T.expression).snap(
				"(In: { data: number } | { data: number }[]) => Out<{ data: number }[]>"
			)
		})
	})
})

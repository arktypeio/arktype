import { attest, contextualize } from "@ark/attest"
import { keywords, scope, type, type Json } from "arktype"
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

	it("invalid Date", () => {
		class NaNTime extends Date {
			override getTime() {
				return Number.NaN
			}
		}
		const { D } = scope({ D: "Date" }).export()
		attest(D.allows(new Date(0))).equals(true)
		attest(D(new Date(Number.NaN)).toString()).equals(
			"must be a Date (was an invalid Date)"
		)
		attest(D.allows(new NaNTime(0))).equals(true)
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
				'foo["0"] must be a number, a string, an object, boolean or null (was a bigint)'
			)
		})

		it("plain objects and arrays only", () => {
			const Json = type("object.json")
			const empty = Object.create(null)

			attest(Json(empty)).equals(empty)
			attest(Json(new Map())?.toString()).snap(
				"must be a plain object or array (was an object)"
			)
			attest(Json(new (class Point {})())?.toString()).snap(
				"must be a plain object or array (was an object)"
			)
			attest(Json({ at: new Date() })?.toString()).snap(
				"at must be a plain object or array (was an object)"
			)
			attest(Json([() => {}])?.toString()).snap(
				'value at ["0"] must be a plain object or array (was a function)'
			)
		})

		it("JSON Schema needs a predicate fallback", () => {
			const Json = type("object.json")

			attest(() => Json.toJsonSchema()).throws("predicate")
			attest(
				Json.toJsonSchema({ fallback: { predicate: ctx => ctx.base } })
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				additionalProperties: { $ref: "#/$defs/jsonData" },
				$defs: {
					jsonData: {
						anyOf: [
							{ type: "number" },
							{ type: "string" },
							{
								type: "object",
								additionalProperties: { $ref: "#/$defs/jsonData" }
							},
							{ type: "boolean" },
							{ type: "null" }
						]
					}
				}
			})
		})

		it("stringify", () => {
			const stringify = type("object.json.stringify")

			const out = stringify.assert({ foo: "bar" })

			attest<string>(out).snap('{"foo":"bar"}')

			// this error kind of sucks, should have more discriminant context
			attest(stringify({ foo: undefined }).toString()).snap(
				"foo must be a number, a string, an object, boolean or null (was undefined)"
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
				"must be a number or an array (was a string)"
			)
			attest(liftNumberArray(["five"]).toString()).snap(
				"value at [0] must be a number (was a string)"
			)
		})

		it("invoked", () => {
			const T = keywords.Array.liftFrom({ data: "number" })

			attest(T.t).type.toString.snap(`(
	In: { data: number }[] | { data: number }
) => To<{ data: number }[]>`)
			attest(T.expression).snap(
				"(In: { data: number } | { data: number }[]) => Out<{ data: number }[]>"
			)
		})
	})
})

import { attest, contextualize } from "@ark/attest"
import { keywords, scope, type, type JsonStructure } from "arktype"
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

	it("object input", () => {
		const O = type("object")
		attest(O.inferIn).type.toString.snap("object")
		attest(type({ a: "object", b: "string = 'b'" }).inferIn).type.toString.snap(
			"{ a: object; b?: string }"
		)
		// @ts-expect-error
		attest(() => O.from(5))
			.throws("must be an object")
			.type.errors("not assignable to parameter of type 'object'")
	})

	it("invalid Date", () => {
		class NaNTime extends Date {
			override getTime() {
				return Number.NaN
			}
		}
		const { D } = scope({ D: "Date" }).export()
		attest(D.allows(new Date(0))).equals(true)
		attest(D(new Date(Number.NaN)).toString()).equals("must be a Date")
		attest(D.allows(new NaNTime(0))).equals(true)
	})

	describe("json", () => {
		it("root", () => {
			const Json = type("object.json")

			// a primitive is valid JSON, but not an object
			attest<JsonStructure>(Json.t)
			attest<JsonStructure>(Json.infer)
			attest<JsonStructure>(Json.inferIn)

			attest(Json({})).equals({})
			attest(Json([])).equals([])
			attest(Json(5)?.toString()).snap("must be an object")
			// @ts-expect-error
			attest(() => Json.from("hi"))
				.throws("must be an object")
				.type.errors("not assignable to parameter of type 'JsonStructure'")
			attest(Json({ foo: [5n] })?.toString()).snap(
				"foo[0] must be a number, a string, an object, boolean or null"
			)
		})

		it("plain objects and arrays only", () => {
			const Json = type("object.json")
			const empty = Object.create(null)

			attest(Json(empty)).equals(empty)
			attest(Json(new Map())?.toString()).snap(
				"must be a plain object or array"
			)
			attest(Json(new (class Point {})())?.toString()).snap(
				"must be a plain object or array"
			)
			attest(Json({ at: new Date() })?.toString()).snap(
				"at must be a plain object or array"
			)
			attest(Json([() => {}])?.toString()).snap(
				"[0] must be a plain object or array"
			)
		})

		it("JSON Schema accepts objects and arrays across targets", () => {
			const Json = type("object.json")
			const expectedBody = {
				anyOf: [{ type: "object" }, { type: "array", items: {} }]
			}

			attest(Json.toJsonSchema()).equals({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				...expectedBody
			})
			attest(Json.toJsonSchema({ target: "draft-07" })).equals({
				$schema: "http://json-schema.org/draft-07/schema#",
				...expectedBody
			})
			attest(Json.toJsonSchema({ target: "openapi-3.0" })).equals(expectedBody)
			attest(Json.toJsonSchema({ target: "openapi-3.1" })).equals(expectedBody)
			attest(
				Json["~standard"].jsonSchema.input({ target: "draft-2020-12" })
			).equals({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				...expectedBody
			})
			attest(
				Json["~standard"].jsonSchema.input({ target: "openapi-3.0" })
			).equals(expectedBody)
		})

		it("stringify", () => {
			const stringify = type("object.json.stringify")

			const out = stringify.assert({ foo: "bar" })

			attest<string>(out).snap('{"foo":"bar"}')
			attest<JsonStructure>(stringify.inferIn)

			// this error kind of sucks, should have more discriminant context
			attest(stringify({ foo: undefined }).toString()).snap(
				"foo must be a number, a string, an object, boolean or null"
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
				"must be a number or an array"
			)
			attest(liftNumberArray(["five"]).toString()).snap("[0] must be a number")
		})

		it("union element", () => {
			// its branches are lifted together, so one array can mix them
			const T = type("Array.liftFrom<string | number>")
			attest<
				(In: string | number | (string | number)[]) => To<(string | number)[]>
			>(T.t)
			attest(T(["a", 1])).equals(["a", 1])
			attest(T(5)).equals([5])
			// as at runtime, an array element isn't lifted
			const U = type("Array.liftFrom<string | number[]>")
			attest<(In: string | string[]) => To<string[]>>(U.t)
			attest(U([1]).toString()).snap("[0] must be a string")
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

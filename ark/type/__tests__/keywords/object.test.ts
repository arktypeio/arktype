import { attest, contextualize } from "@ark/attest"
import { ark, type } from "arktype"
import type { To } from "arktype/internal/keywords/ast.ts"

contextualize(() => {
	it("Function", () => {
		// should not be treated as a morph
		attest<Function>(type("Function").infer)
	})

	it("Date", () => {
		// should not expand built-in classes
		attest(type("Date").infer).type.toString.snap("Date")
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
			const t = ark.Array.liftFrom({ data: "number" })

			attest(t.t).type.toString.snap()
			attest(t.expression).snap(
				"(In: { data: number }) => Out<{ data: number }[]> | (In: { data: number }[]) => Out<{ data: number }[]>"
			)
		})
	})
})

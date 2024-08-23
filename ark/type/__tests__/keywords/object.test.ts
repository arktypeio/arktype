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
				'must be a number or an array (was "five")'
			)
			attest(liftNumberArray(["five"]).toString()).snap(
				"must be a number (was an object) or [0] must be a number (was a string)"
			)
		})

		it("invoked", () => {
			ark.Array.liftFrom({ data: "number" })
		})
	})
})

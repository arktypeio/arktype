import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("Function", () => {
		// should not be treated as a morph
		attest<Function>(type("Function").infer)
	})

	it("Date", () => {
		// should not expand built-in classes
		attest(type("Date").infer).type.toString.snap("Date")
	})
})

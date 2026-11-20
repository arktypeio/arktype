import { attest, contextualize } from "@ark/attest"
import { fromJsonSchema } from "arktype"

contextualize(() => {
	it("bounds", () => {
		attest(
			fromJsonSchema({ type: "number", minimum: 5, exclusiveMaximum: 10 })
				.expression
		).snap("5 <= number < 10")
		attest(
			fromJsonSchema({ type: "number", maximum: 5, exclusiveMaximum: 5 })
				.expression
		).snap("number < 5")
	})

	it("multipleOf", () => {
		attest(fromJsonSchema({ type: "integer", multipleOf: 5 }).expression).snap(
			"number % 5"
		)
	})
})

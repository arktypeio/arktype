import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"

contextualize(() => {
	it("bounds", () => {
		attest(
			jsonSchemaToType({ type: "number", minimum: 5, exclusiveMaximum: 10 })
				.expression
		).snap("5 <= number < 10")
		attest(
			jsonSchemaToType({ type: "number", maximum: 5, exclusiveMaximum: 5 })
				.expression
		).snap("number < 5")
	})

	it("multipleOf", () => {
		attest(
			jsonSchemaToType({ type: "integer", multipleOf: 5 }).expression
		).snap("number % 5")
	})
})

import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"

contextualize(() => {
	it("type integer", () => {
		const t = jsonSchemaToType({ type: "integer" })
		attest(t.expression).snap("number % 1")
	})

	it("bounds", () => {
		const t = jsonSchemaToType({
			type: "number",
			minimum: 5,
			exclusiveMaximum: 10
		})
		attest(t.expression).snap("5 <= number < 10")
	})

	it("inclusive beside exclusive bound", () => {
		attest(
			jsonSchemaToType({
				type: "number",
				maximum: 5,
				exclusiveMaximum: 5
			}).expression
		).snap("number < 5")
	})

	it("multipleOf", () => {
		const t = jsonSchemaToType({
			type: "integer",
			multipleOf: 5
		})
		attest(t.expression).snap("number % 5")
	})
})

import { attest, contextualize } from "@ark/attest"
import {
	jsonSchemaToType,
	writeJsonSchemaNumberMaximumAndExclusiveMaximumMessage,
	writeJsonSchemaNumberMinimumAndExclusiveMinimumMessage
} from "@ark/json-schema"

contextualize(() => {
	it("type number", () => {
		const jsonSchema = { type: "number" } as const

		const parsedNumberValidator = jsonSchemaToType(jsonSchema)
		attest(parsedNumberValidator.expression).snap("number")
	})

	it("type integer", () => {
		const t = jsonSchemaToType({ type: "integer" })
		attest(t.expression).snap("number % 1")
	})

	it("maximum", () => {
		const tMax = jsonSchemaToType({
			type: "number",
			maximum: 5
		})
		attest(tMax.expression).snap("number <= 5")
	})

	it("exclusiveMaximum", () => {
		const tExclMax = jsonSchemaToType({
			type: "number",
			exclusiveMaximum: 5
		})
		attest(tExclMax.expression).snap("number < 5")
	})

	it("maximum & exclusiveMaximum", () => {
		attest(() =>
			jsonSchemaToType({
				type: "number",
				maximum: 5,
				exclusiveMaximum: 5
			})
		).throws(writeJsonSchemaNumberMaximumAndExclusiveMaximumMessage())
	})

	it("minimum", () => {
		const tMin = jsonSchemaToType({ type: "number", minimum: 5 })
		attest(tMin.expression).snap("number >= 5")
	})

	it("exclusiveMinimum", () => {
		const tExclMin = jsonSchemaToType({
			type: "number",
			exclusiveMinimum: 5
		})
		attest(tExclMin.expression).snap("number > 5")
	})

	it("minimum & exclusiveMinimum", () => {
		attest(() =>
			jsonSchemaToType({
				type: "number",
				minimum: 5,
				exclusiveMinimum: 5
			})
		).throws(writeJsonSchemaNumberMinimumAndExclusiveMinimumMessage())
	})

	it("multipleOf", () => {
		const t = jsonSchemaToType({ type: "number", multipleOf: 5 })
		attest(t.expression).snap("number % 5")

		const tInt = jsonSchemaToType({
			type: "integer",
			multipleOf: 5
		})
		attest(tInt.expression).snap("number % 5")
	})
})

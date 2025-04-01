import { attest, contextualize } from "@ark/attest"
import { parseJsonSchema } from "@ark/jsonschema"

contextualize(() => {
	it("type number", () => {
		const jsonSchema = { type: "number" } as const

		const parsedNumberValidator = parseJsonSchema(jsonSchema)
		attest(parsedNumberValidator.expression).snap("number")
	})

	it("type integer", () => {
		const t = parseJsonSchema({ type: "integer" })
		attest(t.expression).snap("number % 1")
	})

	it("maximum", () => {
		const tMax = parseJsonSchema({
			type: "number",
			maximum: 5
		})
		attest(tMax.expression).snap("number <= 5")
	})

	it("exclusiveMaximum", () => {
		const tExclMax = parseJsonSchema({
			type: "number",
			exclusiveMaximum: 5
		})
		attest(tExclMax.expression).snap("number < 5")
	})

	it("maximum & exclusiveMaximum", () => {
		attest(() =>
			parseJsonSchema({
				type: "number",
				maximum: 5,
				exclusiveMaximum: 5
			})
		).throws(
			"ParseError: Provided number JSON Schema cannot have 'maximum' and 'exclusiveMaximum"
		)
	})

	it("minimum", () => {
		const tMin = parseJsonSchema({ type: "number", minimum: 5 })
		attest(tMin.expression).snap("number >= 5")
	})

	it("exclusiveMinimum", () => {
		const tExclMin = parseJsonSchema({
			type: "number",
			exclusiveMinimum: 5
		})
		attest(tExclMin.expression).snap("number > 5")
	})

	it("minimum & exclusiveMinimum", () => {
		attest(() =>
			parseJsonSchema({
				type: "number",
				minimum: 5,
				exclusiveMinimum: 5
			})
		).throws(
			"ParseError: Provided number JSON Schema cannot have 'minimum' and 'exclusiveMinimum"
		)
	})

	it("multipleOf", () => {
		const t = parseJsonSchema({ type: "number", multipleOf: 5 })
		attest(t.expression).snap("number % 5")

		const tInt = parseJsonSchema({
			type: "integer",
			multipleOf: 5
		})
		attest(tInt.expression).snap("number % 5")
	})
})

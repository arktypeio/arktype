import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"

contextualize(() => {
	it("type string", () => {
		const t = jsonSchemaToType({ type: "string" })
		attest(t.expression).snap("string")
	})

	it("maxLength (positive)", () => {
		const tMaxLength = jsonSchemaToType({
			type: "string",
			maxLength: 5
		})
		attest(tMaxLength.expression).snap("string <= 5")
	})

	it("maxLength (negative)", () => {
		const maxLength = -5
		attest(() =>
			jsonSchemaToType({
				type: "string",
				maxLength
			})
		).throws(
			`TraversalError: maxLength must be non-negative (was ${maxLength})`
		)
	})

	it("minLength (positive)", () => {
		const tMinLength = jsonSchemaToType({
			type: "string",
			minLength: 5
		})
		attest(tMinLength.expression).snap("string >= 5")
	})

	it("minLength (negative)", () => {
		const minLength = -1
		attest(() =>
			jsonSchemaToType({
				type: "string",
				minLength
			})
		).throws(
			`TraversalError: minLength must be non-negative (was ${minLength})`
		)
	})

	it("pattern", () => {
		const tPatternString = jsonSchemaToType({
			type: "string",
			pattern: "es"
		})
		attest(tPatternString.expression).snap("/es/")
		// JSON Schema explicitly specifies that regexes MUST NOT be implicitly anchored
		// https://json-schema.org/draft-07/draft-handrews-json-schema-validation-01#rfc.section.4.3
		attest(tPatternString.allows("expression")).equals(true)
	})

	it("string enums", () => {
		const enumKeys = ["keyOne", "keyTwo"]

		const stringEnums = jsonSchemaToType({
			type: "string",
			enum: enumKeys
		})

		attest(stringEnums.expression).snap('"keyOne" | "keyTwo"')
	})
})

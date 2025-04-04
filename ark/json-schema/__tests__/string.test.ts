import { attest, contextualize } from "@ark/attest"
import { parseJsonSchema } from "@ark/json-schema"

contextualize(() => {
	it("type string", () => {
		const t = parseJsonSchema({ type: "string" })
		attest(t.expression).snap("string")
	})

	it("maxLength (positive)", () => {
		const tMaxLength = parseJsonSchema({
			type: "string",
			maxLength: 5
		})
		attest(tMaxLength.expression).snap("string <= 5")
	})

	it("maxLength (negative)", () => {
		const maxLength = -5
		attest(() =>
			parseJsonSchema({
				type: "string",
				maxLength
			})
		).throws(
			`TraversalError: maxLength must be non-negative (was ${maxLength})`
		)
	})

	it("minLength (positive)", () => {
		const tMinLength = parseJsonSchema({
			type: "string",
			minLength: 5
		})
		attest(tMinLength.expression).snap("string >= 5")
	})

	it("minLength (negative)", () => {
		const minLength = -1
		attest(() =>
			parseJsonSchema({
				type: "string",
				minLength
			})
		).throws(
			`TraversalError: minLength must be non-negative (was ${minLength})`
		)
	})

	it("pattern", () => {
		const tPatternString = parseJsonSchema({
			type: "string",
			pattern: "es"
		})
		attest(tPatternString.expression).snap("/es/")
		// JSON Schema explicitly specifies that regexes MUST NOT be implicitly anchored
		// https://json-schema.org/draft-07/draft-handrews-json-schema-validation-01#rfc.section.4.3
		attest(tPatternString.allows("expression")).equals(true)

		const tPatternRegExp = parseJsonSchema({
			type: "string",
			pattern: /es/
		})
		attest(tPatternRegExp.expression).snap("/es/")
		// JSON Schema explicitly specifies that regexes MUST NOT be implicitly anchored
		// https://json-schema.org/draft-07/draft-handrews-json-schema-validation-01#rfc.section.4.3
		attest(tPatternRegExp.allows("expression")).equals(true)
	})
})

import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"
import type { JsonSchemaOrBoolean } from "@ark/schema"

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
				// @ts-expect-error
				maxLength
			})
		).throws.snap(
			"ParseError: #/maxLength must be a non-negative integer (was -5)"
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
				// @ts-expect-error
				minLength
			})
		).throws.snap(
			"ParseError: #/minLength must be a non-negative integer (was -1)"
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

	it("RegExp pattern", () => {
		const T = jsonSchemaToType({ type: "string", pattern: /^es$/i })
		attest(T.expression).snap("/^es$/i")
		attest(T.allows("ES")).equals(true)
	})

	it("string enums", () => {
		const enumKeys = ["keyOne", "keyTwo"]

		const stringEnums = jsonSchemaToType({
			type: "string",
			enum: enumKeys
		})

		attest(stringEnums.expression).snap('"keyOne" | "keyTwo"')
	})

	it("minLength (0)", () => {
		const schema = {
			type: "string",
			minLength: 0
		} satisfies JsonSchemaOrBoolean
		const pattern = jsonSchemaToType(schema)

		attest(() => jsonSchemaToType(schema))
		attest(pattern.expression).snap("string")
	})
})

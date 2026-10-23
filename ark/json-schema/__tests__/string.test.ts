import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"
import type { JsonSchemaOrBoolean } from "@ark/schema"

contextualize(() => {
	it("type string", () => {
		const t = jsonSchemaToType({ type: "string" })
		attest(t.expression).snap("string")
	})

	it("minLength and maxLength", () => {
		attest(jsonSchemaToType({ type: "string", maxLength: 5 }).expression).snap(
			"string <= 5"
		)
		attest(jsonSchemaToType({ type: "string", minLength: 5 }).expression).snap(
			"string >= 5"
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

		attest(pattern.expression).snap("string")
	})
})

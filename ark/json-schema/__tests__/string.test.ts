import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"

contextualize(() => {
	it("pattern", () => {
		const T = jsonSchemaToType({ type: "string", pattern: "es" })
		attest(T.expression).snap("/es/")
		// patterns MUST NOT be implicitly anchored
		// https://json-schema.org/draft-07/draft-handrews-json-schema-validation-01#rfc.section.4.3
		attest(T.allows("expression")).equals(true)
	})

	it("RegExp pattern", () => {
		const T = jsonSchemaToType({ type: "string", pattern: /^es$/i })
		attest(T.expression).snap("/^es$/i")
		attest(T.allows("ES")).equals(true)
	})
})

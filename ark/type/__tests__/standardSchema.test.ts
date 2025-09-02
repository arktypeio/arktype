import { attest, contextualize } from "@ark/attest"
import type { StandardJSONSchemaSourceV1, StandardSchemaV1 } from "@ark/schema"
import type { promisable } from "@ark/util"
import { type } from "arktype"

contextualize(() => {
	it("validation conforms to spec", () => {
		const T = type({ foo: "string" })
		const standard: StandardSchemaV1<{ foo: string }> = T
		const standardOut = standard["~standard"].validate({
			foo: "bar"
		})
		attest<promisable<StandardSchemaV1.Result<{ foo: string }>>>(
			standardOut
		).equals({
			value: { foo: "bar" }
		})

		const badStandardOut = standard["~standard"].validate({
			foo: 5
		}) as StandardSchemaV1.FailureResult

		attest(badStandardOut.issues).instanceOf(type.errors)
		attest(badStandardOut.issues.toString()).snap(
			"foo must be a string (was a number)"
		)
	})

	it("toJSONSchema", () => {
		const T = type({ foo: "string" })
		const standard: StandardJSONSchemaSourceV1 = T
		const jsonSchema = standard["~standard"].toJSONSchema({ io: "input" })
		attest(jsonSchema).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			properties: { foo: { type: "string" } },
			required: ["foo"]
		})
	})
})

import { attest, contextualize } from "@ark/attest"
import type { promisable } from "@ark/util"
import type { v1 } from "@standard-schema/spec"
import { type } from "arktype"

contextualize(() => {
	it("validation conforms to spec", () => {
		const t = type({ foo: "string" })
		const standard: v1.StandardSchema<{ foo: string }> = t
		const standardOut = standard["~standard"].validate({
			foo: "bar"
		})
		attest<promisable<v1.StandardResult<{ foo: string }>>>(standardOut).equals({
			value: { foo: "bar" }
		})

		const badStandardOut = standard["~standard"].validate({
			foo: 5
		}) as v1.StandardFailureResult

		attest(badStandardOut.issues).instanceOf(type.errors)
		attest(badStandardOut.issues.toString()).snap(
			"foo must be a string (was a number)"
		)
	})
})

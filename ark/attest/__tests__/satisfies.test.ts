import { attest, contextualize } from "@ark/attest"
import { nonOverlappingSatisfiesMessage } from "@ark/attest/internal/assert/chainableAssertions.js"

contextualize(() => {
	it("can assert types", () => {
		attest({ foo: "bar" }).satisfies({ foo: "string" })

		attest(() => {
			// @ts-expect-error
			attest({ foo: "bar" }).satisfies({ foo: "number" })
		})
			.throws("foo must be a number (was a string)")
			.type.errors(nonOverlappingSatisfiesMessage)
	})
})

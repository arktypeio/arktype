import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"

contextualize(() => {
	it("parsed", () => {
		const types = scope({
			from: "0 | 1",
			actual: "Extract<from, 1>",
			expected: "1"
		}).export()

		attest<typeof types.expected.t>(types.actual.t)
		attest(types.actual.expression).equals(types.expected.expression)
	})

	it("chained", () => {
		const extracted = type("true | 0 | 'foo'").extract("boolean | number")

		const expected = type("true | 0")

		attest<typeof expected.t>(extracted.t)

		attest(extracted.expression).equals(expected.expression)
	})
})

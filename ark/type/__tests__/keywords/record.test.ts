import { attest, contextualize } from "@ark/attest"
import {
	intrinsic,
	writeIndivisibleMessage,
	writeUnsatisfiedParameterConstraintMessage
} from "@ark/schema"
import { ark, type } from "arktype"

contextualize(() => {
	it("parsed", () => {
		const expected = type({ "[string]": "number" })

		const expression = type("Record<string, number>")
		attest(expression.json).equals(expected.json)
		attest<typeof expected.t>(expression.t)
	})

	it("invoked", () => {
		const expected = type({ "[string]": "number" })

		const t = ark.Record("string", "number")

		attest(t.json).equals(expected.json)
		attest<typeof expected.t>(t.t)
	})

	it("invoked validation error", () => {
		// @ts-expect-error
		attest(() => ark.Record("string", "string % 2")).throwsAndHasTypeError(
			writeIndivisibleMessage(intrinsic.string)
		)
	})

	it("invoked constraint error", () => {
		// @ts-expect-error
		attest(() => ark.Record("boolean", "number"))
			.throws(
				writeUnsatisfiedParameterConstraintMessage(
					"K",
					"string | symbol",
					"boolean"
				)
			)
			.type.errors(`ErrorType<"Invalid argument for K", [expected: Key]>`)
	})
})

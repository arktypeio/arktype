import { attest, contextualize } from "@ark/attest"
import {
	intrinsic,
	writeIndivisibleMessage,
	writeUnsatisfiedParameterConstraintMessage
} from "@ark/schema"
import { keywords, scope, type } from "arktype"

contextualize(() => {
	it("parsed", () => {
		const Expected = type({ "[string]": "number" })

		const Expression = type("Record<string, number>")
		attest(Expression.json).equals(Expected.json)
		attest<typeof Expected.t>(Expression.t)
	})

	it("invoked", () => {
		const Expected = type({ "[string]": "number" })

		const T = keywords.Record("string", "number")

		attest(T.json).equals(Expected.json)
		attest<typeof Expected.t>(T.t)
	})

	// https://github.com/arktypeio/arktype/issues/1600
	it("invoked then piped to a definition", () => {
		const T = type
			.Record("string", "boolean")
			.pipe(o => Object.keys(o))
			.to("string[] > 0")

		attest<string[]>(T.infer)
		attest(T({ a: true })).equals(["a"])
	})

	it("invoked from a scope", () => {
		const $ = scope({ flag: "boolean" })
		const T = $.type.Record("string", "flag").or("flag[]")

		attest(T.expression).snap("{ [string]: boolean } | boolean[]")
		attest(T([true])).equals([true])
	})

	it("invoked validation error", () => {
		// @ts-expect-error
		attest(() => keywords.Record("string", "string % 2")).throwsAndHasTypeError(
			writeIndivisibleMessage(intrinsic.string)
		)
	})

	it("invoked constraint error", () => {
		// @ts-expect-error
		attest(() => keywords.Record("boolean", "number"))
			.throws(
				writeUnsatisfiedParameterConstraintMessage(
					"K",
					"string | symbol",
					"boolean"
				)
			)
			.type.errors(`ErrorType<["Invalid argument for K", expected: Key]>`)
	})
})

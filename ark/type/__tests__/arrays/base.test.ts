import { attest, contextualize } from "@ark/attest"
import { writeUnresolvableMessage } from "@ark/schema"
import { type } from "arktype"
import { incompleteArrayTokenMessage } from "arktype/internal/parser/shift/operator/operator.ts"

contextualize(() => {
	it("allows and apply", () => {
		const T = type("string[]")
		attest<string[]>(T.infer)
		attest(T.allows([])).equals(true)
		attest(T([])).snap([])
		attest(T.allows(["foo", "bar"])).equals(true)
		attest(T(["foo", "bar"])).snap(["foo", "bar"])
		attest(T.allows(["foo", "bar", 5])).equals(false)
		attest(T(["foo", "bar", 5]).toString()).snap(
			"value at [2] must be a string (was a number)"
		)
		attest(T.allows([5, "foo", "bar"])).equals(false)
		attest(T([5, "foo", "bar"]).toString()).snap(
			"value at [0] must be a string (was a number)"
		)
	})

	it("nested", () => {
		const T = type("string[][]")
		attest<string[][]>(T.infer)
		attest(T.allows([])).equals(true)
		attest(T([])).snap([])
		attest(T.allows([["foo"]])).equals(true)
		attest(T([["foo"]])).snap([["foo"]])
		attest(T.allows(["foo"])).equals(false)
		attest(T(["foo"]).toString()).snap(
			"value at [0] must be an array (was string)"
		)
		attest(T.allows([["foo", 5]])).equals(false)
		attest(T([["foo", 5]]).toString()).snap(
			"value at [0][1] must be a string (was a number)"
		)
	})

	it("tuple expression", () => {
		const T = type(["string", "[]"])
		attest<string[]>(T.infer)
		attest(T.json).equals(type("string[]").json)
	})

	it("root expression", () => {
		const T = type("string", "[]")
		attest<string[]>(T.infer)
		attest(T.json).equals(type("string[]").json)
	})

	it("chained", () => {
		const T = type({ a: "string" }).array()
		attest<{ a: string }[]>(T.infer)

		// @ts-expect-error
		attest(() => type({ a: "hmm" }).array()).throwsAndHasTypeError(
			writeUnresolvableMessage("hmm")
		)
	})

	it("incomplete token", () => {
		// @ts-expect-error
		attest(() => type("string[")).throwsAndHasTypeError(
			incompleteArrayTokenMessage
		)
	})

	it("multiple errors", () => {
		const StringArray = type("string[]")
		attest(StringArray([1, 2]).toString())
			.snap(`value at [0] must be a string (was a number)
value at [1] must be a string (was a number)`)
	})
})

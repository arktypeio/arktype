import { attest, contextualize } from "@ark/attest"
import { writeUnresolvableMessage } from "@ark/schema"
import { type } from "arktype"
import { incompleteArrayTokenMessage } from "arktype/internal/parser/shift/operator/operator.ts"

contextualize(() => {
	it("allows and apply", () => {
		const t = type("string[]")
		attest<string[]>(t.infer)
		attest(t.allows([])).equals(true)
		attest(t([])).snap([])
		attest(t.allows(["foo", "bar"])).equals(true)
		attest(t(["foo", "bar"])).snap(["foo", "bar"])
		attest(t.allows(["foo", "bar", 5])).equals(false)
		attest(t(["foo", "bar", 5]).toString()).snap(
			"value at [2] must be a string (was a number)"
		)
		attest(t.allows([5, "foo", "bar"])).equals(false)
		attest(t([5, "foo", "bar"]).toString()).snap(
			"value at [0] must be a string (was a number)"
		)
	})

	it("nested", () => {
		const t = type("string[][]")
		attest<string[][]>(t.infer)
		attest(t.allows([])).equals(true)
		attest(t([])).snap([])
		attest(t.allows([["foo"]])).equals(true)
		attest(t([["foo"]])).snap([["foo"]])
		attest(t.allows(["foo"])).equals(false)
		attest(t(["foo"]).toString()).snap(
			"value at [0] must be an array (was string)"
		)
		attest(t.allows([["foo", 5]])).equals(false)
		attest(t([["foo", 5]]).toString()).snap(
			"value at [0][1] must be a string (was a number)"
		)
	})

	it("tuple expression", () => {
		const t = type(["string", "[]"])
		attest<string[]>(t.infer)
		attest(t.json).equals(type("string[]").json)
	})

	it("root expression", () => {
		const t = type("string", "[]")
		attest<string[]>(t.infer)
		attest(t.json).equals(type("string[]").json)
	})

	it("chained", () => {
		const t = type({ a: "string" }).array()
		attest<{ a: string }[]>(t.infer)

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
		const stringArray = type("string[]")
		attest(stringArray([1, 2]).toString())
			.snap(`value at [0] must be a string (was a number)
value at [1] must be a string (was a number)`)
	})
})

import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import { writeJsonSyntaxErrorProblem } from "arktype/internal/keywords/string.ts"

contextualize(() => {
	let syntaxError: unknown

	try {
		JSON.parse("{")
	} catch (e) {
		syntaxError = e
	}

	// this error varies between Node versions, so easiest to compare it this way
	const expectedSyntaxErrorProblem = writeJsonSyntaxErrorProblem(syntaxError)

	it("string.json", () => {
		const parseJson = type("string.json")
		attest(parseJson('{"a": "hello"}')).snap('{"a": "hello"}')
		attest(parseJson(123).toString()).snap("must be a string (was a number)")

		attest(parseJson("{").toString()).equals(expectedSyntaxErrorProblem)
	})

	it("string.json.parse", () => {
		const parseJson = type("string.json.parse")

		attest(parseJson('{"a": "hello"}')).snap({ a: "hello" })
		attest(parseJson(123)?.toString()).snap("must be a string (was a number)")

		attest(parseJson("{")?.toString()).equals(expectedSyntaxErrorProblem)
	})
})

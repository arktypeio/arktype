import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import { writeJsonSyntaxErrorProblem } from "arktype/internal/keywords/functions.ts"

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

	it("string.json.parse outputs only what its out allows", () => {
		const parseJson = type("string.json.parse")
		attest(parseJson.out.allows(parseJson("null"))).equals(true)
		attest(parseJson("[1e400]")?.toString()).snap(
			"must be a JSON string (SyntaxError: Number is out of range)"
		)
		attest(parseJson(`-1${"0".repeat(310)}`)?.toString()).snap(
			"must be a JSON string (SyntaxError: Number is out of range)"
		)
		// a long string or exponent is parsed rejecting Infinity, and passes
		attest(parseJson(`["${"0".repeat(400)}", 1e+21]`)).equals([
			"0".repeat(400),
			1e21
		])
	})
})

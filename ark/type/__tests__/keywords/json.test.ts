import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("string.json", () => {
		const parseJson = type("string.json")
		attest(parseJson('{"a": "hello"}')).snap('{"a": "hello"}')
		attest(parseJson(123).toString()).snap("must be a string")

		attest(parseJson("{").toString()).snap("must be a JSON string")
		attest(parseJson("pw=hunter2").toString()).snap("must be a JSON string")
	})

	it("string.json.parse", () => {
		const parseJson = type("string.json.parse")

		attest(parseJson('{"a": "hello"}')).snap({ a: "hello" })
		attest(parseJson(123)?.toString()).snap("must be a string")

		attest(parseJson("{")?.toString()).snap("must be a JSON string")
		attest(parseJson("pw=hunter2")?.toString()).snap("must be a JSON string")
		attest(parseJson.meta).snap({
			description: "a JSON string",
			keyword: "string.json.parse"
		})
	})

	it("string.json.parse outputs only what its out allows", () => {
		const parseJson = type("string.json.parse")
		attest(parseJson.out.allows(parseJson("null"))).equals(true)
		const overflow = parseJson("[1e400]")
		if (!(overflow instanceof type.errors)) throw new Error("expected errors")
		attest(overflow.toString()).snap("must be a JSON string")
		attest((overflow.issues[0] as { cause?: unknown }).cause).instanceOf(
			SyntaxError
		)
		attest(parseJson(`-1${"0".repeat(310)}`)?.toString()).snap(
			"must be a JSON string"
		)
		// a long string or exponent is parsed rejecting Infinity, and passes
		attest(parseJson(`["${"0".repeat(400)}", 1e+21]`)).equals([
			"0".repeat(400),
			1e21
		])
	})
})

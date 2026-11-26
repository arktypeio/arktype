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

	it("what string.json and string.json.parse raise is written as their Type is configured", () => {
		attest(type("string.json").describe("a payload")("{").toString()).snap(
			"must be a payload"
		)
		attest(
			type("string.json.parse").describe("a payload")("{")?.toString()
		).snap("must be a payload")
		attest(type("string.json").message("Send JSON")("{").toString()).snap(
			"Send JSON"
		)
		const Parse = type("string.json.parse").message("Send JSON")
		attest(Parse("{")?.toString()).snap("Send JSON")
		attest(Parse("")?.toString()).snap("Send JSON")
		// what parsing threw is still its cause
		attest(
			((Parse("{") as type.errors).issues[0] as { cause?: unknown }).cause
		).instanceOf(SyntaxError)
		attest(Parse("[1]")).snap([1])
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

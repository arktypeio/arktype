import { attest, contextualize } from "@ark/attest"
import { registry } from "@ark/util"
import { type } from "arktype"
import { writeJsonSyntaxErrorProblem } from "arktype/internal/keywords/string/json.ts"

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
		attest(parseJson(123).toString()).snap("must be a string (was a number)")

		attest(parseJson("{").toString()).equals(expectedSyntaxErrorProblem)
	})

	it("number", () => {
		const parseNum = type("string.numeric.parse")
		attest(parseNum("5")).equals(5)
		attest(parseNum("5.5")).equals(5.5)
		attest(parseNum("five").toString()).snap(
			'must be a well-formed numeric string (was "five")'
		)
	})

	it("integer", () => {
		const parseInt = type("string.integer.parse")
		attest(parseInt("5")).equals(5)
		attest(parseInt("5.5").toString()).snap(
			'must be a well-formed integer string (was "5.5")'
		)
		attest(parseInt("five").toString()).snap(
			'must be a well-formed integer string (was "five")'
		)
		attest(parseInt(5).toString()).snap("must be a string (was a number)")
		attest(parseInt("9007199254740992").toString()).snap(
			'must be an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER (was "9007199254740992")'
		)
	})

	it("date", () => {
		const parseDate = type("string.date.parse")
		attest(parseDate("5/21/1993").toString()).snap(
			"Fri May 21 1993 00:00:00 GMT-0400 (Eastern Daylight Time)"
		)
		attest(parseDate("foo").toString()).snap(
			'must be a parsable date (was "foo")'
		)
		attest(parseDate(5).toString()).snap("must be a string (was a number)")
	})

	it("formData", () => {
		const user = type({
			email: "string.email",
			file: "File",
			tags: "Array.liftFrom<string>"
		})

		const parseUserForm = type("FormData.parse").pipe(user)

		attest(parseUserForm).type.toString.snap(`Type<
	(
		In: FormData
	) => To<{
		email: email
		file: File
		tags: (In: string | string[]) => To<string[]>
	}>,
	{}
>`)

		const data = new FormData()

		// Node18 doesn't have a File constructor
		if (process.version.startsWith("v18")) return

		const file = new registry.FileConstructor([], "")

		data.append("email", "david@arktype.io")
		data.append("file", file)
		data.append("tags", "typescript")
		data.append("tags", "arktype")

		const out = parseUserForm(data)
		attest(out).equals({
			email: "david@arktype.io",
			file,
			tags: ["typescript", "arktype"]
		})

		data.set("email", "david")
		data.set("file", null)
		data.append("tags", file)

		attest(parseUserForm(data).toString())
			.snap(`email must be an email address (was "david")
file must be a File instance (was string)
tags[2] must be a string (was an object)`)
	})
})

import { attest, contextualize } from "@ark/attest"
import { registry } from "@ark/util"
import { type } from "arktype"

contextualize(() => {
	it("json", () => {
		const parseJson = type("string.json.parse")
		attest(parseJson('{"a": "hello"}')).snap({ a: "hello" })
		attest(parseJson(123).toString()).snap("must be a string (was a number)")
		attest(parseJson("{").toString()).snap(
			"must be a JSON string (SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2))"
		)
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
			tags: "liftArray<string>"
		})

		const parseUserForm = type("FormData.parse").pipe(user)

		attest(parseUserForm).type.toString.snap(`Type<
	(
		In: FormData
	) => To<{
		email: email
		file: File
		tags: (In: string | string[]) => Out<string[]>
	}>,
	{}
>`)

		const data = new FormData()
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
file must be an instance of File (was string)
tags[2] must be a string (was an object)`)
	})
})

import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("number", () => {
		const parseNum = type("string.numeric.parse")
		attest(parseNum("5")).equals(5)
		attest(parseNum(".5")).equals(0.5)
		attest(parseNum("5.5")).equals(5.5)
		attest(parseNum("five").toString()).snap(
			"must be a well-formed numeric string"
		)
	})

	it("integer", () => {
		const parseInt = type("string.integer.parse")
		attest(parseInt("5")).equals(5)
		attest(parseInt("5.5").toString()).snap(
			"must be a well-formed integer string"
		)
		attest(parseInt("five").toString()).snap(
			"must be a well-formed integer string"
		)
		attest(parseInt(5).toString()).snap("must be a string")
		attest(parseInt("9007199254740992").toString()).snap(
			"must be an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER"
		)
	})

	it("date", () => {
		const parseDate = type("string.date.parse")
		attest(parseDate("5/21/1993").toString()).snap(
			"Fri May 21 1993 00:00:00 GMT-0400 (Eastern Daylight Time)"
		)
		attest(parseDate("foo").toString()).snap("must be a parsable date")
		attest(parseDate(5).toString()).snap("must be a string")
	})
})

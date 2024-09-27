import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("string.date", () => {
		const dateString = type("string.date")
		attest(dateString("2023-01-01")).equals("2023-01-01")
		attest(dateString("foo").toString()).snap(
			'must be a parsable date (was "foo")'
		)
		attest(dateString(new Date()).toString()).snap(
			"must be a string (was an object)"
		)
	})

	it("string.date.parse", () => {
		const parseDate = type("string.date.parse")
		attest(parseDate("5/21/1993").toString()).snap(
			"Fri May 21 1993 00:00:00 GMT-0400 (Eastern Daylight Time)"
		)
		attest(parseDate("foo").toString()).snap(
			'must be a parsable date (was "foo")'
		)
		attest(parseDate(5).toString()).snap("must be a string (was a number)")
	})

	it("string.date.iso", () => {
		const isoDate = type("string.date.iso")
		const d = new Date().toISOString()
		attest(isoDate(d)).equals(d)
		attest(isoDate("05-21-1993").toString()).snap(
			'must be an ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) date (was "05-21-1993")'
		)
	})
})

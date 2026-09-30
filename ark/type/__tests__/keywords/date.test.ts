import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("string.date", () => {
		const DateString = type("string.date")
		attest(DateString("2023-01-01")).equals("2023-01-01")
		attest(DateString("foo").toString()).snap(
			'must be a parsable date (was "foo")'
		)
		attest(DateString(new Date()).toString()).snap(
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
		const IsoDate = type("string.date.iso")
		const d = new Date().toISOString()
		attest(IsoDate(d)).equals(d)
		attest(IsoDate("05-21-1993").toString()).snap(
			'must be an ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) date (was "05-21-1993")'
		)
	})

	it("string.date.epoch.parse", () => {
		const parseEpoch = type("string.date.epoch.parse")
		const toIso = (s: string) => parseEpoch.assert(s).toISOString()
		attest(toIso("0")).equals("1970-01-01T00:00:00.000Z")
		attest(toIso("1700000000000")).equals("2023-11-14T22:13:20.000Z")
		attest(toIso("-86400000")).equals("1969-12-31T00:00:00.000Z")
		attest(parseEpoch("1.5").toString()).snap(
			'must be a well-formed integer string (was "1.5")'
		)
	})
})

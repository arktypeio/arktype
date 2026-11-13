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

	it("string.date.iso rejects days that don't exist in the month", () => {
		const IsoDate = type("string.date.iso")
		attest(IsoDate("2024-06-31").toString()).snap(
			'must be an ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) date (was "2024-06-31")'
		)
		for (const s of [
			"2024-04-31",
			"2024-09-31T10:00:00Z",
			"20241131",
			"2023-02-29",
			"2024-02-30",
			"1900-02-29",
			"2100-02-29T00:00:00.000Z"
		])
			attest(IsoDate.allows(s)).equals(false)

		for (const s of [
			"2024-02-29",
			"2000-02-29T12:00:00Z",
			"20240229",
			"2023-02-28",
			"2024-01-31",
			"2024-04-30",
			"2024-12-31T23:59:59.999Z",
			// month-only, week and ordinal forms are unaffected
			"2023-02",
			"2023-W09-3",
			"2023-060"
		])
			attest(IsoDate.allows(s)).equals(true)
	})

	it("string.date.iso.parse doesn't roll invalid days into the next month", () => {
		const parseIso = type("string.date.iso.parse")
		attest(parseIso("2023-02-29").toString()).snap(
			'must be an ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) date (was "2023-02-29")'
		)
		attest(parseIso.assert("2024-02-29").toISOString()).equals(
			"2024-02-29T00:00:00.000Z"
		)
	})

	it("string.date.iso still converts to JSON Schema", () => {
		const schema = type("string.date.iso").toJsonSchema()
		attest(schema).satisfies({ type: "'string'", pattern: "string" })
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

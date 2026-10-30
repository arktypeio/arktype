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

	it("string.date.parse reads an ISO date as string.date.iso.parse does", () => {
		const ParseDate = type("string.date.parse")
		// new Date reads this in local time
		attest(ParseDate.assert("2020-01-01T12:00").toISOString()).equals(
			"2020-01-01T12:00:00.000Z"
		)
		// new Date rolls it over to March 2
		attest(ParseDate("2025-02-30").toString()).snap(
			'must be a parsable date (was "2025-02-30")'
		)
		attest(type("string.date").allows("2025-02-30")).equals(false)
		attest(ParseDate.assert("2025-W01-1").toISOString()).equals(
			"2024-12-30T00:00:00.000Z"
		)
	})

	it("string.date.iso", () => {
		const IsoDate = type("string.date.iso")
		const d = new Date().toISOString()
		attest(IsoDate(d)).equals(d)
		attest(IsoDate("05-21-1993").toString()).snap(
			'must be an ISO 8601 date or date-time (was "05-21-1993")'
		)
	})

	it("string.date.iso.parse reads a form without an offset in UTC", () => {
		const ParseIso = type("string.date.iso.parse")
		const toIso = (s: string) => ParseIso.assert(s).toISOString()
		// new Date reads these in local time
		attest(toIso("2025-01-01T12:00")).equals("2025-01-01T12:00:00.000Z")
		attest(toIso("2025-001")).equals("2025-01-01T00:00:00.000Z")
		attest(toIso("2025-01-01T24:00")).equals("2025-01-02T00:00:00.000Z")
		attest(toIso("2025-01-01T12:00-05:30")).equals("2025-01-01T17:30:00.000Z")
	})

	it("string.date.iso.parse reads forms new Date can't", () => {
		const ParseIso = type("string.date.iso.parse")
		const toIso = (s: string) => ParseIso.assert(s).toISOString()
		attest(toIso("2025-W01-1")).equals("2024-12-30T00:00:00.000Z")
		attest(toIso("2020-W53-7")).equals("2021-01-03T00:00:00.000Z")
		attest(toIso("20250101T1230")).equals("2025-01-01T12:30:00.000Z")
		attest(toIso("2025-01-01T12.5+01")).equals("2025-01-01T11:30:00.000Z")
	})

	it("string.date.iso.parse rejects a date that doesn't exist", () => {
		const ParseIso = type("string.date.iso.parse")
		attest(ParseIso("2025-02-29").toString()).snap(
			'must be an ISO 8601 date or date-time (was "2025-02-29")'
		)
		attest(ParseIso("2025-W53-1").toString()).snap(
			'must be an ISO 8601 date or date-time (was "2025-W53-1")'
		)
		attest(ParseIso("2025-366").toString()).snap(
			'must be an ISO 8601 date or date-time (was "2025-366")'
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
		attest(
			type({ at: parseEpoch })({ at: "99999999999999999999" }).toString()
		).snap(
			"at must be a Unix timestamp before 8640000000000000 (was 100000000000000000000)"
		)
	})
})

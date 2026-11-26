import { attest, contextualize } from "@ark/attest"
import { isIso8601Date, iso8601DateMatcher, iso8601Matcher } from "@ark/util"
import { fromJsonSchema, keywords, type } from "arktype"

contextualize(() => {
	it("string.date", () => {
		const DateString = type("string.date")
		attest(DateString("2023-01-01")).equals("2023-01-01")
		attest(DateString("foo").toString()).snap("must be a parsable date")
		attest(DateString(new Date()).toString()).snap("must be a string")
	})

	it("string.date.parse", () => {
		const parseDate = type("string.date.parse")
		attest(parseDate("5/21/1993").toString()).snap(
			"Fri May 21 1993 00:00:00 GMT-0400 (Eastern Daylight Time)"
		)
		attest(parseDate("foo").toString()).snap("must be a parsable date")
		attest(parseDate(5).toString()).snap("must be a string")
	})

	it("string.date.parse reads an ISO date as string.date.iso.parse does", () => {
		const ParseDate = type("string.date.parse")
		// new Date reads this in local time
		attest(ParseDate.assert("2020-01-01T12:00").toISOString()).equals(
			"2020-01-01T12:00:00.000Z"
		)
		// new Date rolls it over to March 2
		attest(ParseDate("2025-02-30").toString()).snap("must be a parsable date")
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
			"must be an ISO 8601 date or date-time"
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
			"must be an ISO 8601 date or date-time"
		)
		attest(ParseIso("2025-W53-1").toString()).snap(
			"must be an ISO 8601 date or date-time"
		)
		attest(ParseIso("2025-366").toString()).snap(
			"must be an ISO 8601 date or date-time"
		)
	})

	it("string.date.iso rejects days that don't exist in the month", () => {
		const IsoDate = type("string.date.iso")
		attest(IsoDate("2024-06-31").toString()).snap(
			"must be an ISO 8601 date or date-time"
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

	it("string.date.iso reads a leap day after a sign and before a time", () => {
		const IsoDate = type("string.date.iso")
		attest(IsoDate.allows("+2024-02-29T00:00:00+05:30")).equals(true)
		attest(IsoDate.allows("-2000-02-29")).equals(true)
		attest(IsoDate.allows("-2023-02-29")).equals(false)
		attest(IsoDate.allows("2023-02-29T10:00-05:00")).equals(false)
		attest(IsoDate.allows("20230229T1030")).equals(false)
	})

	it("string.date rejects a day its month doesn't have in either ISO form", () => {
		const DateString = type("string.date")
		attest(DateString.allows("2025-04-31T10:00Z")).equals(false)
		attest(DateString.allows("20250431")).equals(false)
		attest(DateString.allows("2024-02-29T10:00Z")).equals(true)
	})

	it("string.date.iso still converts to JSON Schema", () => {
		attest(type("string.date.iso").toJsonSchema()).equals({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "string",
			pattern: iso8601Matcher.source,
			format: "date-time"
		})
	})

	it("string.date.iso.date", () => {
		const IsoDateOnly = type("string.date.iso.date")
		attest<string>(IsoDateOnly.infer)
		attest(IsoDateOnly("2025-01-01")).equals("2025-01-01")
		attest(keywords.string.date.iso.date("2024-02-29")).equals("2024-02-29")
		attest(IsoDateOnly("2025-02-30").toString()).snap(
			"must be an ISO 8601 date"
		)
		attest(IsoDateOnly(20250101).toString()).snap("must be a string")

		for (const valid of [
			"0000-01-01",
			"0000-02-29",
			"1600-02-29",
			"2000-02-29",
			"2024-02-29",
			"2400-02-29",
			"2025-02-28",
			"2025-01-31",
			"2025-03-31",
			"2025-04-30",
			"2025-05-31",
			"2025-06-30",
			"2025-07-31",
			"2025-08-31",
			"2025-09-30",
			"2025-10-31",
			"2025-11-30",
			"2025-12-31",
			"9999-12-31"
		]) {
			attest(IsoDateOnly.allows(valid)).equals(true)
			attest(iso8601DateMatcher.test(valid)).equals(true)
			attest(isIso8601Date(valid)).equals(true)
		}

		for (const invalid of [
			"",
			"2025",
			"2025-01",
			"20250101",
			"2025-1-01",
			"2025-01-1",
			"2025-00-01",
			"2025-13-01",
			"2025-01-00",
			"2025-01-32",
			"2025-02-29",
			"2025-02-30",
			"2024-02-30",
			"1900-02-29",
			"2100-02-29",
			"2025-04-31",
			"2025-06-31",
			"2025-09-31",
			"2025-11-31",
			"2025-01-01T00:00:00Z",
			"+2025-01-01",
			"-2025-01-01",
			"2025/01/01",
			" 2025-01-01",
			"2025-01-01 ",
			"2025-W01-1",
			"2025-001",
			"abcd-01-01"
		]) {
			attest(IsoDateOnly.allows(invalid)).equals(false)
			attest(iso8601DateMatcher.test(invalid)).equals(false)
			attest(isIso8601Date(invalid)).equals(false)
		}

		// verify fast-path isIso8601Date matches iso8601DateMatcher across every year's Feb 29
		for (let year = 0; year <= 9999; year++) {
			const s = `${String(year).padStart(4, "0")}-02-29`
			const expected = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
			if (
				isIso8601Date(s) !== expected ||
				iso8601DateMatcher.test(s) !== expected
			)
				throw new Error(`leap-year mismatch for ${s}`)
		}

		const jsonSchema = IsoDateOnly.toJsonSchema()
		attest(jsonSchema).equals({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "string",
			pattern: iso8601DateMatcher.source,
			format: "date"
		})
		const roundTripped = fromJsonSchema(jsonSchema)
		attest(roundTripped.expression).equals(IsoDateOnly.expression)
		attest(roundTripped.meta.format).equals("date")
		attest(roundTripped.allows("2024-02-29")).equals(true)
		attest(roundTripped.allows("2025-02-29")).equals(false)
		attest(roundTripped.allows("2025-01-01T00:00:00Z")).equals(false)
	})

	it("string.date.epoch.parse", () => {
		const parseEpoch = type("string.date.epoch.parse")
		const toIso = (s: string) => parseEpoch.assert(s).toISOString()
		attest(toIso("0")).equals("1970-01-01T00:00:00.000Z")
		attest(toIso("1700000000000")).equals("2023-11-14T22:13:20.000Z")
		attest(toIso("-86400000")).equals("1969-12-31T00:00:00.000Z")
		attest(parseEpoch("1.5").toString()).snap(
			"must be a well-formed integer string"
		)
		attest(
			type({ at: parseEpoch })({ at: "99999999999999999999" }).toString()
		).snap("at must be a Unix timestamp before 8640000000000000")
	})
})

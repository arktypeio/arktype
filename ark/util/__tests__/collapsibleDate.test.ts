import { attest, contextualize } from "@ark/attest"
import { describeCollapsibleDate } from "@ark/util"

contextualize(() => {
	it("returns year for date with only year precision", () => {
		const date = new Date("2023-01-01")
		const result = describeCollapsibleDate(date)
		attest(result).snap("2023")
	})

	it("returns full date for date with day precision", () => {
		const date = new Date("2023-01-15")
		const result = describeCollapsibleDate(date)
		attest(result).snap("January 15, 2023")
	})

	it("returns full date and time for date with minutes precision", () => {
		const date = new Date("2023-01-15T14:30:00.000Z")
		const result = describeCollapsibleDate(date)
		attest(result).snap("January 15, 2023, 2:30 PM UTC")
	})

	it("returns full date and time for date with seconds", () => {
		const date = new Date("1993-02-15T19:30:31Z")
		const result = describeCollapsibleDate(date)
		attest(result).snap("February 15, 1993, 7:30:31 PM UTC")
	})

	it("returns full date and time with milliseconds", () => {
		const date = new Date("2023-12-15T14:30:00.123Z")
		const result = describeCollapsibleDate(date)
		attest(result).snap("December 15, 2023, 2:30:00.123 PM UTC")
	})

	it("handles midnight correctly", () => {
		const date = new Date("2023-01-15T00:00:00.000Z")
		const result = describeCollapsibleDate(date)
		attest(result).snap("January 15, 2023")
	})

	it("handles noon correctly", () => {
		const date = new Date("2023-02-15T12:00:00.000Z")
		const result = describeCollapsibleDate(date)
		attest(result).snap("February 15, 2023, 12:00 PM UTC")
	})

	it("handles AM/PM correctly", () => {
		const dateAM = new Date("2023-01-15T09:00:00.000Z")
		const resultAM = describeCollapsibleDate(dateAM)
		attest(resultAM).snap("January 15, 2023, 9:00 AM UTC")

		const datePM = new Date("2023-01-15T21:00:00.000Z")
		const resultPM = describeCollapsibleDate(datePM)
		attest(resultPM).snap("January 15, 2023, 9:00 PM UTC")
	})

	it("collapses local midnight", () => {
		attest(describeCollapsibleDate(new Date(2023, 0, 1))).snap("2023")
		attest(describeCollapsibleDate(new Date(2023, 0, 15))).snap(
			"January 15, 2023"
		)
	})

	it("describes New York time in UTC", () => {
		const date = new Date(2023, 0, 15, 9)
		attest(describeCollapsibleDate(date)).snap("January 15, 2023, 2:00 PM UTC")
	})

	it("January 1 time keeps year", () => {
		const date = new Date("2023-01-01T14:30:00.000Z")
		attest(describeCollapsibleDate(date)).snap("January 1, 2023, 2:30 PM UTC")
	})

	it("doesn't depend on the default locale's time format", () => {
		const toLocaleTimeString = Date.prototype.toLocaleTimeString
		// simulate a system whose default locale uses a 24-hour clock
		Date.prototype.toLocaleTimeString = function () {
			return toLocaleTimeString.call(this, "de-DE")
		}
		try {
			const date = new Date("2023-01-15T14:30:00.000Z")
			attest(describeCollapsibleDate(date)).snap(
				"January 15, 2023, 2:30 PM UTC"
			)
		} finally {
			Date.prototype.toLocaleTimeString = toLocaleTimeString
		}
	})
})

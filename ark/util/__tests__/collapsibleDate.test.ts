import { attest, contextualize } from "@ark/attest"
import { describeCollapsibleDate } from "@ark/util"

contextualize(() => {
	// a bare year would read as the whole year
	it("keeps the day of January 1", () => {
		const date = new Date("2023-01-01")
		const result = describeCollapsibleDate(date)
		attest(result).snap("January 1, 2023")
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

	it("handles noon correctly", () => {
		const date = new Date("2023-02-15T12:00:00.000Z")
		const result = describeCollapsibleDate(date)
		attest(result).snap("February 15, 2023, 12:00 PM UTC")
	})

	it("handles AM correctly", () => {
		const date = new Date("2023-01-15T09:00:00.000Z")
		attest(describeCollapsibleDate(date)).snap("January 15, 2023, 9:00 AM UTC")
	})

	it("doesn't collapse local midnight", () => {
		attest(describeCollapsibleDate(new Date(2023, 0, 1))).snap(
			"January 1, 2023, 5:00 AM UTC"
		)
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

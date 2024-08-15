import { attest, contextualize } from "@ark/attest"
import { describeCollapsibleDate, throwError } from "@ark/util"

const newYorkDate = (dateString: string) => {
	const date = new Date(dateString)
	if (date.getMonth() > 1 && date.getMonth() < 11) {
		throwError(
			`This test util only supports months not affected by Daylight Savings Time`
		)
	}
	date.setHours(date.getHours() + 5)
	return date
}

contextualize(() => {
	it("returns year for date with only year precision", () => {
		const date = newYorkDate("2023-01-01")
		const result = describeCollapsibleDate(date)
		attest(result).snap("2023")
	})

	it("returns full date for date with day precision", () => {
		const date = newYorkDate("2023-01-15")
		const result = describeCollapsibleDate(date)
		attest(result).snap("January 15, 2023")
	})

	it("returns full date and time for date with minutes precision", () => {
		const date = newYorkDate("2023-01-15T14:30:00.000Z")
		const result = describeCollapsibleDate(date)
		attest(result).snap("2:30 PM, January 15, 2023")
	})

	it("returns full date and time for date with seconds", () => {
		const date = newYorkDate("1993-02-15T14:30:31")
		const result = describeCollapsibleDate(date)
		attest(result).snap("7:30:31 PM, February 15, 1993")
	})

	it("returns full date and time with milliseconds", () => {
		const date = newYorkDate("2023-12-15T14:30:00.123Z")
		const result = describeCollapsibleDate(date)
		attest(result).snap("2:30:00.123 PM, December 15, 2023")
	})

	it("handles midnight correctly", () => {
		const date = newYorkDate("2023-01-15T00:00:00.000Z")
		const result = describeCollapsibleDate(date)
		attest(result).snap("January 15, 2023")
	})

	it("handles noon correctly", () => {
		const date = newYorkDate("2023-02-15T12:00:00.000Z")
		const result = describeCollapsibleDate(date)
		attest(result).snap("12:00 PM, February 15, 2023")
	})

	it("handles AM/PM correctly", () => {
		const dateAM = newYorkDate("2023-01-15T09:00:00.000Z")
		const resultAM = describeCollapsibleDate(dateAM)
		attest(resultAM).snap("9:00 AM, January 15, 2023")

		const datePM = newYorkDate("2023-01-15T21:00:00.000Z")
		const resultPM = describeCollapsibleDate(datePM)
		attest(resultPM).snap("9:00 PM, January 15, 2023")
	})
})

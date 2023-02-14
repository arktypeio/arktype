// ISO8601 date/time modernized from https://github.com/validatorjs/validator.js/blob/master/src/lib/isISO8601.js

// Based on https://tc39.es/ecma262/#sec-date-time-string-format, the T
// delimiter for date/time is mandatory. Regex from validator.js strict matcher:
const iso8601Matcher =
    /^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/

const isLeapYear = (year: number) =>
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

export const isValidDate = (data: string) => {
    if (!iso8601Matcher.test(data)) {
        return false
    }
    const ordinalMatch = data.match(/^(\d{4})-?(\d{3})([ T]{1}\.*|$)/)
    if (ordinalMatch) {
        const year = Number(ordinalMatch[1])
        const day = Number(ordinalMatch[2])
        const maxDay = isLeapYear(year) ? 366 : 365
        return day < maxDay
    }

    const {
        1: year,
        2: month,
        3: day
    } = (data
        .match(/(\d{4})-?(\d{0,2})-?(\d*)/)
        ?.map((part) => parseInt(part)) ?? []) as Record<number, number>

    const date = new Date(
        `${year}-${month ? `0${month}`.slice(-2) : "01"}-${
            day ? `0${day}`.slice(-2) : "01"
        }`
    )

    if (month && day) {
        return (
            date.getUTCFullYear() === year &&
            date.getUTCMonth() + 1 === month &&
            date.getUTCDate() === day
        )
    }
    return true
}

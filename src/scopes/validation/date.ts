import { node } from "../../nodes/type/type.js"

type DayDelimiter = "." | "/" | "-"

const dayDelimiterMatcher = /^[./-]$/

type DayPart = DayPatterns[PartKey]

type PartKey = keyof DayPatterns

type DayPatterns = {
    y: "yy" | "yyyy"
    m: "mm" | "m"
    d: "dd" | "d"
}

type fragment<part extends DayPart, delimiter extends DayDelimiter> =
    | `${delimiter}${part}`
    | ""

export type DayPattern<delimiter extends DayDelimiter = DayDelimiter> = {
    [d in delimiter]: {
        [k1 in keyof DayPatterns]: {
            [k2 in Exclude<
                keyof DayPatterns,
                k1
            >]: `${DayPatterns[k1]}${fragment<DayPatterns[k2], d>}${fragment<
                DayPatterns[Exclude<keyof DayPatterns, k1 | k2>],
                d
            >}`
        }[Exclude<keyof DayPatterns, k1>]
    }[keyof DayPatterns]
}[delimiter]

export type DateFormat = "iso8601" | DayPattern

export type DateOptions = {
    format?: DateFormat
}

// ISO 8601 date/time modernized from https://github.com/validatorjs/validator.js/blob/master/src/lib/isISO8601.js
// Based on https://tc39.es/ecma262/#sec-date-time-string-format, the T
// delimiter for date/time is mandatory. Regex from validator.js strict matcher:
const iso8601Matcher =
    /^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/

type ParsedDayParts = {
    y?: string
    m?: string
    d?: string
}

const isValidDateInstance = (date: Date) => !isNaN(date as any)

const writeFormattedMustBe = (format: DateFormat) =>
    `a ${format}-formatted date`

export const tryParseDatePattern = (
    data: string,
    opts?: DateOptions
): Date | string => {
    if (!opts?.format) {
        const result = new Date(data)
        return isValidDateInstance(result) ? result : "a valid date"
    }
    if (opts.format === "iso8601") {
        return iso8601Matcher.test(data)
            ? new Date(data)
            : writeFormattedMustBe("iso8601")
    }
    const dataParts = data.split(dayDelimiterMatcher)
    // will be the first delimiter matched, if there is one
    const delimiter: string | undefined = data[dataParts[0].length]
    const formatParts = delimiter ? opts.format.split(delimiter) : [opts.format]

    if (dataParts.length !== formatParts.length) {
        return writeFormattedMustBe(opts.format)
    }

    const parsedParts: ParsedDayParts = {}
    for (let i = 0; i < formatParts.length; i++) {
        if (
            dataParts[i].length !== formatParts[i].length &&
            // if format is "m" or "d", data is allowed to be 1 or 2 characters
            !(formatParts[i].length === 1 && dataParts[i].length === 2)
        ) {
            return writeFormattedMustBe(opts.format)
        }
        parsedParts[formatParts[i][0] as PartKey] = dataParts[i]
    }

    const date = new Date(`${parsedParts.m}/${parsedParts.d}/${parsedParts.y}`)

    if (`${date.getDate()}` === parsedParts.d) {
        return date
    }
    return writeFormattedMustBe(opts.format)
}

export const parsedDate = node({
    basis: "string",
    morph: (s, state) => {
        const result = tryParseDatePattern(s)
        return typeof result === "string"
            ? // TODO: Fix
              state.mustBe(result, s, state.basePath)
            : result
    }
})

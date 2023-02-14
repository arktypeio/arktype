import { throwParseError } from "../../utils/errors"

export type DateDelimiter = "." | "/" | "-"

export type DateOptions = {
    format?: string
    delimiters?: DateDelimiter[]
}

// Adapted from https://github.com/validatorjs/validator.js/blob/master/src/lib/isDate.js
const dateFormatMatcher =
    /(^(y{4}|y{2})[./-](m{1,2})[./-](d{1,2})$)|(^(m{1,2})[./-](d{1,2})[./-]((y{4}|y{2})$))|(^(d{1,2})[./-](m{1,2})[./-]((y{4}|y{2})$))/gi

type ParsedDateParts = {
    y?: string
    m?: string
    d?: string
}

export const tryParseDate = (
    data: string,
    options?: DateOptions
): Date | undefined => {
    const format = options?.format
        ? dateFormatMatcher.test(options.format)
            ? options.format.toLowerCase()
            : throwParseError(`Invalid date format '${options.format}'`)
        : "yyyy/mm/dd"
    const delimiters = options?.delimiters ?? ["/", "-"]
    const delimiter = delimiters.find((delimiter) =>
        format.includes(delimiter)
    )!
    const dataParts = data.split(delimiter)
    const formatParts = format.split(delimiter)

    const partPairs: [data: string, format: string][] = []
    for (let i = 0; i < dataParts.length && i < formatParts.length; i++) {
        partPairs.push([dataParts[i], formatParts[i]])
    }

    const parsedDate: ParsedDateParts = {}

    for (const [dataPart, formatPart] of partPairs) {
        if (dataPart.length !== formatPart.length) {
            return
        }
        parsedDate[formatPart[0] as keyof ParsedDateParts] = dataPart
    }

    const date = new Date(`${parsedDate.m}/${parsedDate.d}/${parsedDate.y}`)

    if (date.getDate() === parseInt(parsedDate.d!)) {
        return date
    }
}

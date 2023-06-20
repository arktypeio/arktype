import { throwParseError } from "../../../../utils/errors.js"

export type DateLiteral<value extends string = string> = `d${value}`

export const isValidDate = (d: Date) => d.toString() !== "Invalid Date"

export const looksLikeDate = (s: string) => /d(['"]).*(\1)/.test(s)

export const extractDate = (s: string) => s.slice(2, -1)

export const getDateFromInput = (s: string) => {
    const date = s === "" ? new Date() : new Date(s)
    return date
}

export const getValidDateFromInputOrThrow = (s: string) => {
    const date = getDateFromInput(s)
    if (isValidDate(date)) {
        return date
    }
    return throwParseError(writeInvalidDateMessage(s))
}

export const writeInvalidDateMessage = (s: string) =>
    `new Date(${s}) resulted in an Invalid Date. (Suggested format: YYYY/MM/DD)`

export type DateInput = ConstructorParameters<typeof Date>[0]

export const d = (dateInput: DateInput) =>
    dateInput instanceof Date
        ? dateInput.valueOf()
        : new Date(dateInput).valueOf()

export const isWellFormedDate = (s: string) => {
    const extractedDate = extractDate(s)
    const date = extractedDate === "" ? new Date() : new Date(extractedDate)

    return isValidDate(date)
}

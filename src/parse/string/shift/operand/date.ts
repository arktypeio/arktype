import { throwParseError } from "../../../../../dev/utils/main.js"

export type DateLiteral<value extends string = string> = `d${value}`

export const isValidDate = (d: Date) => d.toString() !== "Invalid Date"

export const dateEnclosing = (s: string) => /^d/.test(s)

export const extractDate = (s: string) => s.slice(2, -1)

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

export const tryParseDate = <ErrorOnFail extends boolean | string>(
    token: string,
    errorOnFail?: ErrorOnFail
) => parseDate(token, errorOnFail)

const parseDate = <ErrorOnFail extends boolean | string>(
    token: string,
    errorOnFail?: ErrorOnFail
): ErrorOnFail extends true | string ? Date : Date | undefined => {
    const date = new Date(token)
    if (isValidDate(date)) {
        return date
    }
    return (
        errorOnFail
            ? throwParseError(
                  errorOnFail === true
                      ? writeInvalidDateMessage(token)
                      : errorOnFail
              )
            : undefined
    ) as any
}

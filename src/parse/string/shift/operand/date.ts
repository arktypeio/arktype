import { throwParseError } from "../../../../../dev/utils/main.js"

export type DateLiteral<value extends string = string> =
    | `d"${value}"`
    | `d'${value}'`

export const isValidDate = (d: Date) => d.toString() !== "Invalid Date"

export const hasDateEnclosing = (s: unknown) =>
    typeof s === "string" && /^d/.test(s)

export const extractDate = (s: string) => s.slice(2, -1)

export const writeInvalidDateMessage = <s extends string>(
    s: s
): writeInvalidDateMessage<s> =>
    `new Date(${s}) resulted in an Invalid Date. (Suggested format: YYYY/MM/DD)`

export type writeInvalidDateMessage<s extends string> =
    `new Date(${s}) resulted in an Invalid Date. (Suggested format: YYYY/MM/DD)`

export type DateInput = ConstructorParameters<typeof Date>[0]

export const getDateFromLiteral = (d: string) => new Date(extractDate(d))

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
): ErrorOnFail extends true | string ? string : string | undefined => {
    const date = getDateFromLiteral(token)
    if (isValidDate(date)) {
        return token
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

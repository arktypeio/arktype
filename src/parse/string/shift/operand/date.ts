import { throwParseError } from "../../../../../dev/utils/src/errors.js"

export type DateLiteral<value extends string = string> =
    | `d"${value}"`
    | `d'${value}'`

export const isValidDate = (d: Date) => d.toString() !== "Invalid Date"

export const hasDateEnclosing = (s: unknown): s is DateLiteral =>
    /^d/.test(s as DateLiteral)

export const extractDate = (s: string) => s.slice(2, -1)

export const writeInvalidDateMessage = <s extends string>(
    s: s
): writeInvalidDateMessage<s> => `new Date(${s}) resulted in an Invalid Date`

export type writeInvalidDateMessage<s extends string> =
    `new Date(${s}) resulted in an Invalid Date`

export type DateInput = ConstructorParameters<typeof Date>[0]

export const tryParseDate = <ErrorOnFail extends boolean | string>(
    token: string,
    errorOnFail?: ErrorOnFail
) => parseDate(token, errorOnFail)

const parseDate = <ErrorOnFail extends boolean | string>(
    token: string,
    errorOnFail?: ErrorOnFail
): ErrorOnFail extends true | string ? Date : Date | undefined => {
    const date = new Date(extractDate(token))
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

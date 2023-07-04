import { throwParseError } from "../../../../../dev/utils/src/errors.js"

export type DateLiteral<source extends string = string> =
    | `d"${source}"`
    | `d'${source}'`

export const isDateLiteral = (s: string): s is DateLiteral =>
    s[0] === "d" && (s[1] === "'" || s[1] === '"') && s.at(-1) === s[1]

export const isValidDate = (d: Date) => d.toString() !== "Invalid Date"

export const extractDateLiteralSource = <literal extends DateLiteral>(
    literal: literal
) => literal.slice(2, -1) as extractDateLiteralSource<literal>

type extractDateLiteralSource<literal extends DateLiteral> =
    literal extends DateLiteral<infer source> ? source : never

export const writeInvalidDateMessage = <source extends string>(
    source: source
): writeInvalidDateMessage<source> =>
    `'${source}' could not be parsed by the Date constructor`

export type writeInvalidDateMessage<source extends string> =
    `'${source}' could not be parsed by the Date constructor`

export type DateInput = ConstructorParameters<typeof Date>[0]

export const tryParseDate = <ErrorOnFail extends boolean | string>(
    token: string,
    errorOnFail?: ErrorOnFail
) => (isDateLiteral(token) ? maybeParseDate(token, errorOnFail) : undefined)

const maybeParseDate = <errorOnFail extends boolean | string>(
    token: DateLiteral,
    errorOnFail?: errorOnFail
): Date | (errorOnFail extends true | string ? never : undefined) => {
    const date = new Date(extractDateLiteralSource(token))
    if (isValidDate(date)) {
        return date
    }
    return errorOnFail
        ? throwParseError(
              errorOnFail === true
                  ? writeInvalidDateMessage(token)
                  : errorOnFail
          )
        : (undefined as never)
}

import { throwParseError } from "./errors.js"

export type BigintLiteral<Value extends bigint = bigint> = `${Value}n`

export type NumberLiteral<Value extends number = number> = `${Value}`

export type IntegerLiteral<Value extends bigint = bigint> = `${Value}`

/**
 * The goal of the number literal and bigint literal regular expressions is to:
 *
 *   1. Ensure definitions form a bijection with the values they represent.
 *   2. Attempt to mirror TypeScript's own format for stringification of numeric
 *      values such that the regex should match a given definition if any only if
 *      a precise literal type will be inferred (in TS4.8+).
 */

/**
 *  Matches a well-formatted numeric expression according to the following rules:
 *    1. Must include an integer portion (i.e. '.321' must be written as '0.321')
 *    2. The first digit of the value must not be 0, unless the entire integer portion is 0
 *    3. If the value includes a decimal, its last digit may not be 0
 *    4. The value may not be "-0"
 */
export const wellFormedNumberMatcher =
    /^(?!^-0$)-?(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/
const isWellFormedNumber = (s: string) => wellFormedNumberMatcher.test(s)

const numberLikeMatcher = /^-?\d*\.?\d*$/
const isNumberLike = (s: string) => s.length !== 0 && numberLikeMatcher.test(s)

/**
 *  Matches a well-formatted integer according to the following rules:
 *    1. Must begin with an integer, the first digit of which cannot be 0 unless the entire value is 0
 *    2. The value may not be "-0"
 */
export const wellFormedIntegerMatcher = /^(?:0|(?:-?[1-9]\d*))$/
export const isWellFormedInteger = (s: string) =>
    wellFormedIntegerMatcher.test(s)

export const wellFormedNonNegativeIntegerMatcher = /^(?:0|(?:[1-9]\d*))$/

const integerLikeMatcher = /^-?\d+$/
const isIntegerLike = (s: string) => integerLikeMatcher.test(s)

type NumericLiteralKind = "number" | "bigint" | "integer"

const numericLiteralDescriptions = {
    number: "a number",
    bigint: "a bigint",
    integer: "an integer"
} as const

type numericLiteralDescriptions = typeof numericLiteralDescriptions

export type writeMalformedNumericLiteralMessage<
    def extends string,
    kind extends NumericLiteralKind
> = `'${def}' was parsed as ${numericLiteralDescriptions[kind]} but could not be narrowed to a literal value. Avoid unnecessary leading or trailing zeros and other abnormal notation`

export const writeMalformedNumericLiteralMessage = <
    def extends string,
    kind extends NumericLiteralKind
>(
    def: def,
    kind: kind
): writeMalformedNumericLiteralMessage<def, kind> =>
    `'${def}' was parsed as ${numericLiteralDescriptions[kind]} but could not be narrowed to a literal value. Avoid unnecessary leading or trailing zeros and other abnormal notation`

type ValidationKind = "number" | "integer"

const isWellFormed = (def: string, kind: ValidationKind) =>
    kind === "number" ? isWellFormedNumber(def) : isWellFormedInteger(def)

const parseKind = (def: string, kind: ValidationKind) =>
    kind === "number" ? Number(def) : Number.parseInt(def)

const isKindLike = (def: string, kind: ValidationKind) =>
    kind === "number" ? isNumberLike(def) : isIntegerLike(def)

export const tryParseWellFormedNumber = <ErrorOnFail extends boolean | string>(
    token: string,
    errorOnFail?: ErrorOnFail
) => parseWellFormed(token, "number", errorOnFail)

export type tryParseWellFormedNumber<
    token extends string,
    messageOnFail extends string
> = token extends NumberLiteral<infer value>
    ? value
    : // TODO: reenable "well formed" https://github.com/arktypeio/arktype/issues/659
      //   number extends value
      //     ? writeMalformedNumericLiteralMessage<token, "number">
      //     : value
      messageOnFail

export const tryParseWellFormedInteger = <errorOnFail extends boolean | string>(
    token: string,
    errorOnFail?: errorOnFail
) => parseWellFormed(token, "integer", errorOnFail)

// We use bigint to check if the string matches an integer, but here we
// convert it to a plain number by exploiting the fact that TS stringifies
// numbers and bigints the same way.
export type tryParseWellFormedInteger<
    token extends string,
    messageOnFail extends string
> = token extends IntegerLiteral<infer value>
    ? // TODO: reenable "well formed" https://github.com/arktypeio/arktype/issues/659
      // bigint extends value
      //     ? writeMalformedNumericLiteralMessage<token, "integer">
      // :
      `${value}` extends NumberLiteral<infer valueAsNumber>
        ? valueAsNumber
        : never
    : messageOnFail

const parseWellFormed = <ErrorOnFail extends boolean | string>(
    token: string,
    kind: ValidationKind,
    errorOnFail?: ErrorOnFail
): ErrorOnFail extends true | string ? number : number | undefined => {
    const value = parseKind(token, kind)
    if (!Number.isNaN(value)) {
        if (isWellFormed(token, kind)) {
            return value
        }
        if (isKindLike(token, kind)) {
            // If the definition looks like the correct numeric kind but is
            // not well-formed, always throw.
            return throwParseError(
                writeMalformedNumericLiteralMessage(token, kind)
            )
        }
    }
    return (
        errorOnFail
            ? throwParseError(
                  errorOnFail === true
                      ? `Failed to parse ${numericLiteralDescriptions[kind]} from '${token}'`
                      : errorOnFail
              )
            : undefined
    ) as any
}

export const tryParseWellFormedBigint = (def: string) => {
    if (def[def.length - 1] !== "n") {
        return
    }
    const maybeIntegerLiteral = def.slice(0, -1)
    let value
    try {
        value = BigInt(maybeIntegerLiteral)
    } catch {
        return
    }
    if (wellFormedIntegerMatcher.test(maybeIntegerLiteral)) {
        return value
    }
    if (integerLikeMatcher.test(maybeIntegerLiteral)) {
        // If the definition looks like a bigint but is
        // not well-formed, throw.
        return throwParseError(
            writeMalformedNumericLiteralMessage(def, "bigint")
        )
    }
}

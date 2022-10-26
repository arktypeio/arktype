import type { ParseError } from "../../common.js"
import { throwParseError } from "../../common.js"

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
const wellFormedNumberMatcher = /^(?!^-0$)-?(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/
export const isWellFormedNumber = (s: string) => wellFormedNumberMatcher.test(s)

const numberLikeMatcher = /^-?\d*\.?\d*$/
export const isNumberLike = (s: string) => numberLikeMatcher.test(s)

/**
 *  Matches a well-formatted integer according to the following rules:
 *    1. Must begin with an integer, the first digit of which cannot be 0 unless the entire value is 0
 *    2. The value may not be "-0"
 */
const wellFormedIntegerMatcher = /^(?:0|(?:-?[1-9]\d*))$/
export const isWellFormedInteger = (s: string) =>
    wellFormedIntegerMatcher.test(s)

const integerLikeMatcher = /^-?\d*$/
export const isIntegerLike = (s: string) => integerLikeMatcher.test(s)

type NumericLiteralKind = "number" | "bigint" | "integer"

const numericLiteralDescriptions = {
    number: "a number",
    bigint: "a bigint",
    integer: "an integer"
} as const

type numericLiteralDescriptions = typeof numericLiteralDescriptions

type buildMalformedNumericLiteralMessage<
    def extends string,
    kind extends NumericLiteralKind
> = `'${def}' was parsed as ${numericLiteralDescriptions[kind]} but could not be narrowed to a literal value. Avoid unnecessary leading or trailing zeros and other abnormal notation.`

export const buildMalformedNumericLiteralMessage = <
    def extends string,
    kind extends NumericLiteralKind
>(
    def: def,
    kind: kind
): buildMalformedNumericLiteralMessage<def, kind> =>
    `'${def}' was parsed as ${numericLiteralDescriptions[kind]} but could not be narrowed to a literal value. Avoid unnecessary leading or trailing zeros and other abnormal notation.`

export namespace UnenclosedNumber {
    export type ValidationKind = "number" | "integer"

    const isWellFormed = (def: string, kind: ValidationKind) =>
        kind === "number" ? isWellFormedNumber(def) : isWellFormedInteger(def)

    const parseKind = (def: string, kind: ValidationKind) =>
        kind === "number" ? Number.parseFloat(def) : Number.parseInt(def)

    const isKindLike = (def: string, kind: ValidationKind) =>
        kind === "number" ? isNumberLike(def) : isIntegerLike(def)

    export type assertWellFormed<
        def extends string,
        inferredValue extends number,
        kind extends ValidationKind
    > = number extends inferredValue
        ? ParseError<buildMalformedNumericLiteralMessage<def, kind>>
        : def

    export const parseWellFormed = <ErrorOnFail extends string | undefined>(
        token: string,
        kind: ValidationKind,
        errorOnFail?: ErrorOnFail
    ): ErrorOnFail extends string ? number : number | undefined => {
        const value = parseKind(token, kind)
        if (!Number.isNaN(value)) {
            if (isWellFormed(token, kind)) {
                return value
            }
            if (isKindLike(token, kind)) {
                // If the definition looks like the correct numeric kind but is
                // not well-formed, always throw.
                return throwParseError(
                    buildMalformedNumericLiteralMessage(token, kind)
                )
            }
        }
        return (errorOnFail ? throwParseError(errorOnFail) : undefined) as any
    }

    export type parseWellFormedNumber<
        token extends string,
        badNumberMessage extends string
    > = token extends NumberLiteral<infer Value>
        ? number extends Value
            ? buildMalformedNumericLiteralMessage<token, "number">
            : token
        : badNumberMessage

    export type parseWellFormedInteger<
        token extends string,
        badIntegerMessage extends string
    > = token extends NumberLiteral<infer Value>
        ? bigint extends Value
            ? buildMalformedNumericLiteralMessage<token, "integer">
            : token
        : badIntegerMessage
}

export namespace UnenclosedBigint {
    export const parseWellFormed = (def: string) => {
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
                buildMalformedNumericLiteralMessage(def, "bigint")
            )
        }
    }

    export type assertWellFormed<
        def extends string,
        inferredValue extends bigint
    > = bigint extends inferredValue
        ? ParseError<buildMalformedNumericLiteralMessage<def, "bigint">>
        : def
}

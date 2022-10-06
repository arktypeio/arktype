import type { PrimitiveLiteral } from "../../../nodes/terminal/primitiveLiteral.js"
import type { ParseError } from "../../../parser/common.js"
import { throwParseError } from "../../../parser/common.js"

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
const wellFormedNumberMatcherSource =
    "(?!^-0$)-?(?:0|[1-9]\\d*)(?:\\.\\d*[1-9])?"

const wellFormedNumberMatcher = new RegExp(`^${wellFormedNumberMatcherSource}$`)

/**
 *  Matches a well-formatted integer according to the following rules:
 *    1. Must begin with an integer, the first digit of which cannot be 0 unless the entire value is 0
 *    2. The value may not be "-0"
 */
const wellFormedIntegerMatcherSource = "(?:0|(?:-?[1-9]\\d*))"

const wellFormedIntegerMatcher = new RegExp(
    `^${wellFormedIntegerMatcherSource}$`
)

type NumericLiteralKind = "number" | "bigint" | "integer"

type buildMalformedNumericLiteralMessage<
    def extends string,
    kind extends NumericLiteralKind
> = `'${def}' was parsed as a ${kind} but could not be narrowed to a literal value. Avoid unnecessary leading or trailing zeros and other abnormal notation.`

export const buildMalformedNumericLiteralMessage = <
    def extends string,
    kind extends NumericLiteralKind
>(
    def: def,
    kind: kind
): buildMalformedNumericLiteralMessage<def, kind> =>
    `'${def}' was parsed as a ${kind} but could not be narrowed to a literal value. Avoid unnecessary leading or trailing zeros and other abnormal notation.`

export namespace UnenclosedNumber {
    export type ValidationKind = "number" | "integer"

    export const maybeParse = (def: string) => {
        const result = Number.parseFloat(def)
        return Number.isNaN(result) ? null : result
    }

    export const isWellFormed = (def: string, kind: ValidationKind) =>
        kind === "number"
            ? wellFormedNumberMatcher.test(def)
            : wellFormedIntegerMatcher.test(def)

    export const assertWellFormed = (def: string, kind: ValidationKind) => {
        if (!isWellFormed(def, kind)) {
            throwParseError(buildMalformedNumericLiteralMessage(def, kind))
        }
    }

    export type assertWellFormed<
        def extends string,
        inferredValue extends number,
        kind extends ValidationKind
    > = number extends inferredValue
        ? ParseError<buildMalformedNumericLiteralMessage<def, kind>>
        : def

    export const parseWellFormed = (
        token: string,
        badTokenMessage: string,
        kind: ValidationKind
    ) => {
        const value =
            kind === "integer"
                ? Number.parseInt(token)
                : Number.parseFloat(token)
        if (Number.isNaN(value)) {
            throwParseError(badTokenMessage)
        }
        assertWellFormed(token, kind)
        return value
    }

    type IntegerLiteral<Value extends bigint> = `${Value}`

    export type parseWellFormedNumber<
        token extends string,
        badNumberMessage extends string
    > = token extends PrimitiveLiteral.Number<infer Value>
        ? number extends Value
            ? buildMalformedNumericLiteralMessage<token, "number">
            : token
        : badNumberMessage

    export type parseWellFormedInteger<
        token extends string,
        badIntegerMessage extends string
    > = token extends IntegerLiteral<infer Value>
        ? bigint extends Value
            ? buildMalformedNumericLiteralMessage<token, "integer">
            : token
        : badIntegerMessage
}

export namespace UnenclosedBigint {
    export const maybeParse = (def: string) => {
        if (def[def.length - 1] !== "n") {
            return null
        }
        try {
            return BigInt(def.slice(0, -1))
        } catch {
            return null
        }
    }

    export const assertWellFormed = (apparentDef: string) => {
        if (!wellFormedIntegerMatcher.test(apparentDef.slice(0, -1))) {
            throwParseError(
                buildMalformedNumericLiteralMessage(apparentDef, "bigint")
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

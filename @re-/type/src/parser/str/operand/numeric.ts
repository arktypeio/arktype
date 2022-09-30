import type { PrimitiveLiteral } from "../../../nodes/terminal/literal.js"
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

type MalformedNumericLiteralMessage<
    Def extends string,
    Kind extends NumericLiteralKind
> = `'${Def}' was parsed as a ${Kind} but could not be narrowed to a literal value. Avoid unnecessary leading or trailing zeros and other abnormal notation.`

export const malformedNumericLiteralMessage = <
    Def extends string,
    Kind extends NumericLiteralKind
>(
    def: Def,
    kind: Kind
): MalformedNumericLiteralMessage<Def, Kind> =>
    `'${def}' was parsed as a ${kind} but could not be narrowed to a literal value. Avoid unnecessary leading or trailing zeros and other abnormal notation.`

export namespace UnenclosedNumber {
    export type ValidationKind = "number" | "integer"

    export const maybeParse = (def: string) => {
        const result = Number.parseFloat(def)
        return Number.isNaN(result) ? null : result
    }

    export const isWellFormed = (apparentDef: string, kind: ValidationKind) =>
        kind === "number"
            ? wellFormedNumberMatcher.test(apparentDef)
            : wellFormedIntegerMatcher.test(apparentDef)

    export const assertWellFormed = (
        apparentDef: string,
        kind: ValidationKind
    ) => {
        if (!isWellFormed(apparentDef, kind)) {
            throwParseError(malformedNumericLiteralMessage(apparentDef, kind))
        }
    }

    export type AssertWellFormed<
        ApparentDef extends string,
        ApparentLiteralValue extends number,
        Kind extends ValidationKind
    > = number extends ApparentLiteralValue
        ? ParseError<MalformedNumericLiteralMessage<ApparentDef, Kind>>
        : ApparentDef

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

    type MaybeInteger<Value extends bigint> = `${Value}`

    export type ParseWellFormedNumber<
        Token extends string,
        BadNumberMessage extends string
    > = Token extends PrimitiveLiteral.Number<infer Value>
        ? number extends Value
            ? MalformedNumericLiteralMessage<Token, "number">
            : Value
        : BadNumberMessage

    export type ParseWellFormedInteger<
        Token extends string,
        BadIntegerMessage extends string
    > = Token extends MaybeInteger<infer Value>
        ? bigint extends Value
            ? MalformedNumericLiteralMessage<Token, "integer">
            : UnenclosedBigint.ToNumber<Value>
        : BadIntegerMessage
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
                malformedNumericLiteralMessage(apparentDef, "bigint")
            )
        }
    }

    export type AssertWellFormed<
        ApparentDef extends string,
        ApparentLiteralValue extends bigint
    > = bigint extends ApparentLiteralValue
        ? ParseError<MalformedNumericLiteralMessage<ApparentDef, "bigint">>
        : ApparentDef

    type EmbeddedNumber<Value extends number> = `${Value}`

    export type ToNumber<BigintValue extends bigint> =
        `${BigintValue}` extends EmbeddedNumber<infer AsNumber>
            ? AsNumber
            : never
}

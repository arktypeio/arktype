import { Base } from "../../nodes/base.js"
import { alias } from "../../nodes/types/terminal/alias.js"
import { Keyword } from "../../nodes/types/terminal/keywords/keyword.js"
import { literalNode } from "../../nodes/types/terminal/literal.js"
import { Left } from "../parser/left.js"
import { scanner, Scanner } from "../parser/scanner.js"
import { parserState, ParserState } from "../parser/state.js"
import {
    BaseTerminatingChar,
    baseTerminatingChars,
    ExpressionExpectedMessage,
    expressionExpectedMessage
} from "./common.js"

const lookaheadIsBaseTerminating: scanner.UntilCondition = (scanner) =>
    scanner.lookahead in baseTerminatingChars

export const parseUnenclosedBase = (s: parserState, ctx: Base.context) => {
    const token = s.r.shiftUntil(lookaheadIsBaseTerminating)
    s.l.root = unenclosedToNode(s, token, ctx)
    return s
}

export type ParseUnenclosedBase<
    S extends ParserState,
    Fragment extends string,
    Unscanned extends string,
    Dict
> = Unscanned extends Scanner.Shift<infer Next, infer Rest>
    ? Next extends BaseTerminatingChar
        ? ReduceUnenclosed<S["L"], Unscanned, Fragment, Dict>
        : ParseUnenclosedBase<S, `${Fragment}${Next}`, Rest, Dict>
    : ReduceUnenclosed<S["L"], Unscanned, Fragment, Dict>

export const toNodeIfResolvableIdentifier = (
    token: string,
    ctx: Base.context
) =>
    Keyword.matches(token)
        ? Keyword.parse(token)
        : alias.matches(token, ctx)
        ? new alias(token, ctx)
        : undefined

/**
 * The goal of the number literal and bigint literal regular expressions is to:
 *
 *   1. Ensure definitions form a bijection with the values they represent.
 *   2. Attempt to mirror TypeScript's own format for stringification of numeric
 *      values such that the regex should match a given definition if any only if
 *      a precise literal type will be inferred (in TS4.8+).
 */

export type NumberLiteralDefinition<Value extends number = number> = `${Value}`

/**
 *  Matches a well-formatted numeric expression according to the following rules:
 *    1. Must include an integer portion (i.e. '.321' must be written as '0.321')
 *    2. The first digit of the value must not be 0, unless the entire integer portion is 0
 *    3. If the value includes a decimal, its last digit may not be 0
 *    4. The value may not be "-0"
 */
const NUMBER_MATCHER = /^(?!^-0$)-?(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/

export const isNumberLiteral = (def: string): def is NumberLiteralDefinition =>
    NUMBER_MATCHER.test(def)

/**
 *  Matches a well-formatted bigint expression according to the following rules:
 *    1. Must begin with an integer, the first digit of which cannot be 0 unless the entire value is 0
 *    2. The value may not be "-0"
 *    3. The literal character "n" terminates the definition and must immediately succeed the integer from 1.
 */
export type BigintLiteralDefinition<Value extends bigint = bigint> = `${Value}n`

const BIGINT_MATCHER = /^(?:0|(?:-?[1-9]\d*))n$/

export const isBigintLiteral = (def: string): def is BigintLiteralDefinition =>
    BIGINT_MATCHER.test(def)

export const numberLiteralToValue = (def: NumberLiteralDefinition) => {
    const value = parseFloat(def)
    if (Number.isNaN(value)) {
        throw new Error(
            `Unexpectedly failed to parse a numeric value from '${value}'.`
        )
    }
    return value
}

export type BooleanLiteralDefinition<Value extends boolean = boolean> =
    `${Value}`

export const toNodeIfLiteral = (token: string) =>
    isNumberLiteral(token)
        ? new literalNode(numberLiteralToValue(token))
        : isBigintLiteral(token)
        ? new literalNode(BigInt(token.slice(0, -1)))
        : token === "true"
        ? new literalNode(true)
        : token === "false"
        ? new literalNode(false)
        : undefined

const unenclosedToNode = (s: parserState, token: string, ctx: Base.context) =>
    toNodeIfResolvableIdentifier(token, ctx) ??
    toNodeIfLiteral(token) ??
    s.error(
        token === ""
            ? expressionExpectedMessage(s.r.unscanned)
            : unresolvableMessage(token)
    )

type ReduceUnenclosed<
    L extends Left,
    Unscanned extends string,
    Token extends string,
    Dict
> = IsResolvableUnenclosed<Token, Dict> extends true
    ? ParserState.From<{ L: Left.SetRoot<L, Token>; R: Unscanned }>
    : Token extends ""
    ? ParserState.Error<ExpressionExpectedMessage<Unscanned>>
    : ParserState.Error<UnresolvableMessage<Token>>

type UnresolvableMessage<Token extends string> =
    `'${Token}' is not a builtin type and does not exist in your space.`

export const unresolvableMessage = <Token extends string>(
    token: Token
): UnresolvableMessage<Token> =>
    `'${token}' is not a builtin type and does not exist in your space.`

export type IsResolvableName<Token, Dict> = Token extends Keyword.Definition
    ? true
    : Token extends keyof Dict
    ? true
    : false

type IsResolvableUnenclosed<Token, Dict> = IsResolvableName<
    Token,
    Dict
> extends true
    ? true
    : Token extends NumberLiteralDefinition
    ? true
    : Token extends BigintLiteralDefinition
    ? true
    : Token extends BooleanLiteralDefinition
    ? true
    : false

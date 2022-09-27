import { Alias } from "../../../nodes/terminals/alias.js"
import type { KeywordDefinition } from "../../../nodes/terminals/keywords/keyword.js"
import {
    matchesKeyword,
    parseKeyword
} from "../../../nodes/terminals/keywords/keyword.js"
import type {
    BigintLiteralDefinition,
    BooleanLiteralDefinition,
    NumberLiteralDefinition
} from "../../../nodes/terminals/literal.js"
import { LiteralNode } from "../../../nodes/terminals/literal.js"
import type { ParserContext, parserContext } from "../../common.js"
import type { Left } from "../state/left.js"
import type { Scanner } from "../state/scanner.js"
import type {
    ExpressionExpectedMessage,
    ParserState,
    parserState
} from "../state/state.js"
import { expressionExpectedMessage } from "../state/state.js"

export const parseUnenclosedBase = (s: parserState, ctx: parserContext) => {
    const token = s.r.shiftUntilNextTerminator()
    s.l.root = unenclosedToNode(s, token, ctx)
    return s
}

// TODO: Shift until?
export type ParseUnenclosedBase<
    S extends ParserState,
    Fragment extends string,
    Unscanned extends string,
    Ctx extends ParserContext
> = Unscanned extends Scanner.Shift<infer Lookahead, infer NextUnscanned>
    ? Lookahead extends Scanner.TerminatingChar
        ? ReduceUnenclosed<S["L"], Unscanned, Fragment, Ctx>
        : ParseUnenclosedBase<S, `${Fragment}${Lookahead}`, NextUnscanned, Ctx>
    : ReduceUnenclosed<S["L"], Unscanned, Fragment, Ctx>

export const toNodeIfResolvableIdentifier = (
    token: string,
    ctx: parserContext
) =>
    matchesKeyword(token)
        ? parseKeyword(token, ctx)
        : ctx.space?.aliases?.[token]
        ? new Alias(token, ctx)
        : undefined

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
const NUMBER_MATCHER = /^(?!^-0$)-?(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/

export const isNumberLiteral = (def: string): def is NumberLiteralDefinition =>
    NUMBER_MATCHER.test(def)

export type IntegerLiteralDefinition<Value extends bigint = bigint> = `${Value}`

const INT_MATCHER = /^(?:0|(?:-?[1-9]\d*))$/

export const isIntegerLiteral = (
    def: string
): def is IntegerLiteralDefinition => INT_MATCHER.test(def)

/**
 *  Matches a well-formatted bigint expression according to the following rules:
 *    1. Must begin with an integer, the first digit of which cannot be 0 unless the entire value is 0
 *    2. The value may not be "-0"
 *    3. The literal character "n" terminates the definition and must immediately succeed the integer from 1.
 */
const BIGINT_MATCHER = new RegExp(INT_MATCHER.source.slice(0, -1) + "n$")

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

export const toNodeIfLiteral = (token: string, ctx: parserContext) =>
    isNumberLiteral(token)
        ? new LiteralNode(token, numberLiteralToValue(token), ctx)
        : isBigintLiteral(token)
        ? new LiteralNode(token, BigInt(token.slice(0, -1)), ctx)
        : token === "true"
        ? new LiteralNode(token, true, ctx)
        : token === "false"
        ? new LiteralNode(token, false, ctx)
        : undefined

const unenclosedToNode = (s: parserState, token: string, ctx: parserContext) =>
    toNodeIfResolvableIdentifier(token, ctx) ??
    toNodeIfLiteral(token, ctx) ??
    s.error(
        token === ""
            ? expressionExpectedMessage(s.r.unscanned)
            : unresolvableMessage(token)
    )

type ReduceUnenclosed<
    L extends Left,
    Unscanned extends string,
    Token extends string,
    Ctx extends ParserContext
> = IsResolvableUnenclosed<Token, Ctx> extends true
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

export type IsResolvableIdentifier<
    Token,
    Ctx extends ParserContext
> = Token extends KeywordDefinition
    ? true
    : Token extends keyof Ctx["Aliases"]
    ? true
    : false

type IsResolvableUnenclosed<
    Token,
    Ctx extends ParserContext
> = IsResolvableIdentifier<Token, Ctx> extends true
    ? true
    : Token extends NumberLiteralDefinition
    ? true
    : Token extends BigintLiteralDefinition
    ? true
    : Token extends BooleanLiteralDefinition
    ? true
    : false

import { alias } from "../../../nodes/types/terminal/alias.js"
import { BigintLiteralDefinition, bigintLiteralNode } from "./bigintLiteral.js"
import {
    BaseTerminatingChar,
    baseTerminatingChars,
    ExpressionExpectedMessage,
    expressionExpectedMessage,
    Node,
    Parser
} from "./common.js"
import { Keyword } from "./keyword/index.js"
import { NumberLiteralDefinition, numberLiteralNode } from "./numberLiteral.js"

const lookaheadIsBaseTerminating: Parser.scanner.UntilCondition = (scanner) =>
    scanner.lookahead in baseTerminatingChars

export const parseUnenclosedBase = (s: Parser.state, ctx: Nodes.context) => {
    const token = s.r.shiftUntil(lookaheadIsBaseTerminating)
    s.l.root = unenclosedToNode(s, token, ctx)
    return s
}

export type ParseUnenclosedBase<
    S extends Parser.State,
    Fragment extends string,
    Unscanned extends string,
    Dict
> = Unscanned extends Parser.Scanner.Shift<infer Next, infer Rest>
    ? Next extends BaseTerminatingChar
        ? ReduceUnenclosed<S["L"], Unscanned, Fragment, Dict>
        : ParseUnenclosedBase<S, `${Fragment}${Next}`, Rest, Dict>
    : ReduceUnenclosed<S["L"], Unscanned, Fragment, Dict>

export const toNodeIfResolvableIdentifier = (
    token: string,
    ctx: Nodes.context
) => {
    if (Keyword.matches(token)) {
        return Keyword.parse(token)
    } else if (alias.matches(token, ctx)) {
        return new alias(token, ctx)
    }
}

const unenclosedToNode = (
    s: Parser.state,
    token: string,
    ctx: Nodes.context
) => {
    const possibleIdentifierNode = toNodeIfResolvableIdentifier(token, ctx)
    if (possibleIdentifierNode) {
        return possibleIdentifierNode
    }
    if (numberLiteralNode.matches(token)) {
        return new numberLiteralNode(token)
    }
    if (bigintLiteralNode.matches(token)) {
        return new bigintLiteralNode(token)
    }
    if (!token) {
        throw new Error(expressionExpectedMessage(s.r.unscanned))
    }
    throw new Error(unresolvableMessage(token))
}

type ReduceUnenclosed<
    L extends Parser.Left,
    Unscanned extends string,
    Token extends string,
    Dict
> = IsResolvableUnenclosed<Token, Dict> extends true
    ? Parser.State.From<{ L: Parser.Left.SetRoot<L, Token>; R: Unscanned }>
    : Token extends ""
    ? Parser.State.Error<ExpressionExpectedMessage<Unscanned>>
    : Parser.State.Error<UnresolvableMessage<Token>>

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
    : false

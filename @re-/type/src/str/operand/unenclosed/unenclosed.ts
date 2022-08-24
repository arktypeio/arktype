import { Node, Parser } from "../common.js"
import { AliasNode, AliasType } from "./alias.js"
import { BigintLiteralDefinition, BigintLiteralNode } from "./bigintLiteral.js"
import { Keyword } from "./keyword/index.js"
import { NumberLiteralDefinition, NumberLiteralNode } from "./numberLiteral.js"

const lookaheadIsBaseTerminating: Parser.scanner.UntilCondition = (scanner) =>
    scanner.lookahead in Parser.Tokens.baseTerminatingChars

export const parseUnenclosedBase = (s: Parser.state, ctx: Node.context) => {
    const token = s.r.shiftUntil(lookaheadIsBaseTerminating)
    s.l.root = unenclosedToNode(token, ctx)
    return s
}

export type ParseUnenclosedBase<
    S extends Parser.State,
    Fragment extends string,
    Unscanned extends string,
    Dict
> = Unscanned extends Parser.Scanner.Shift<infer Next, infer Rest>
    ? Next extends Parser.Tokens.BaseTerminatingChar
        ? Parser.State.From<{
              L: ReduceUnenclosed<S["L"], Fragment, Dict>
              R: Unscanned
          }>
        : ParseUnenclosedBase<S, `${Fragment}${Next}`, Rest, Dict>
    : Parser.State.From<{ L: ReduceUnenclosed<S["L"], Fragment, Dict>; R: "" }>

export const toNodeIfResolvableIdentifier = (
    token: string,
    ctx: Node.context
) => {
    if (Keyword.matches(token)) {
        return Keyword.parse(token)
    } else if (AliasNode.matches(token, ctx)) {
        return new AliasNode(token, ctx)
    }
}

const unenclosedToNode = (token: string, ctx: Node.context) => {
    const possibleIdentifierNode = toNodeIfResolvableIdentifier(token, ctx)
    if (possibleIdentifierNode) {
        return possibleIdentifierNode
    }
    if (NumberLiteralNode.matches(token)) {
        return new NumberLiteralNode(token)
    }
    if (BigintLiteralNode.matches(token)) {
        return new BigintLiteralNode(token)
    }
    throw new Error(unresolvableMessage(token))
}

type ReduceUnenclosed<
    L extends Parser.Left,
    Token extends string,
    Dict
> = IsResolvableUnenclosed<Token, Dict> extends true
    ? Parser.Left.SetRoot<L, Token>
    : Parser.Left.Error<UnresolvableMessage<Token>>

type UnresolvableMessage<Token extends string> =
    `'${Token}' is not a builtin type and does not exist in your space.`

const unresolvableMessage = <Token extends string>(
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
    : Token extends NumberLiteralDefinition | BigintLiteralDefinition
    ? true
    : false

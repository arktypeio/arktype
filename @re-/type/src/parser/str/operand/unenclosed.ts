import { Alias } from "../../../nodes/terminal/alias.js"
import type { ParserContext, parserContext } from "../../common.js"
import type { Left } from "../state/left.js"
import type { Scanner } from "../state/scanner.js"
import type {
    ExpressionExpectedMessage,
    ParserState,
    parserState
} from "../state/state.js"
import { expressionExpectedMessage } from "../state/state.js"

export namespace Unenclosed {
    export const parse = (s: parserState, ctx: parserContext) => {
        const token = s.r.shiftUntilNextTerminator()
        s.l.root = unenclosedToNode(s, token, ctx)
        return s
    }

    export type Parse<
        S extends ParserState,
        Ctx extends ParserContext
    > = Scanner.ShiftUntilNextTerminator<S["R"]> extends Scanner.Shifted<
        infer Scanned,
        infer NextUnscanned
    >
        ? Reduce<S["L"], Scanned, NextUnscanned, Ctx>
        : never

    export const maybeParseIdentifier = (token: string, ctx: parserContext) =>
        matchesKeyword(token)
            ? parseKeyword(token, ctx)
            : ctx.space?.aliases?.[token]
            ? new Alias(token, ctx)
            : undefined

    export const maybeParseLiteral = (token: string, ctx: parserContext) =>
        isNumberLiteral(token)
            ? new LiteralNode(token, numberLiteralToValue(token), ctx)
            : isBigintLiteral(token)
            ? new LiteralNode(token, BigInt(token.slice(0, -1)), ctx)
            : token === "true"
            ? new LiteralNode(token, true, ctx)
            : token === "false"
            ? new LiteralNode(token, false, ctx)
            : undefined

    const unenclosedToNode = (
        s: parserState,
        token: string,
        ctx: parserContext
    ) =>
        maybeParseIdentifier(token, ctx) ??
        maybeParseLiteral(token, ctx) ??
        s.error(
            token === ""
                ? expressionExpectedMessage(s.r.unscanned)
                : unresolvableMessage(token)
        )

    type Reduce<
        L extends Left,
        Token extends string,
        Unscanned extends string,
        Ctx extends ParserContext
    > = IsResolvable<Token, Ctx> extends true
        ? ParserState.From<{ L: Left.SetRoot<L, Token>; R: Unscanned }>
        : Token extends ""
        ? ParserState.Error<ExpressionExpectedMessage<Unscanned>>
        : ParserState.Error<UnresolvableMessage<Token>>

    type UnresolvableMessage<Token extends string> =
        `'${Token}' is not a builtin type and does not exist in your space`

    export const unresolvableMessage = <Token extends string>(
        token: Token
    ): UnresolvableMessage<Token> =>
        `'${token}' is not a builtin type and does not exist in your space`

    export type IsResolvableIdentifier<
        Token,
        Ctx extends ParserContext
    > = Token extends KeywordDefinition
        ? true
        : Token extends keyof Ctx["aliases"]
        ? true
        : false

    type IsResolvable<
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
}

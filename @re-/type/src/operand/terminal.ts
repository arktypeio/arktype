import { AliasNode, AliasType } from "./alias.js"
import { Node, Parser } from "./common.js"
import { Keyword } from "./keyword/index.js"
import {
    BigintLiteralDefinition,
    BigintLiteralNode,
    InferLiteral,
    NumberLiteralDefinition,
    NumberLiteralNode,
    RegexLiteralDefinition,
    RegexLiteralNode,
    StringLiteralDefinition,
    StringLiteralNode
} from "./literal/index.js"

export namespace Terminal {
    const unterminatedEnclosedMessage = <
        Fragment extends string,
        Enclosing extends Parser.Tokens.EnclosedBaseStartChar
    >(
        fragment: Fragment,
        enclosing: Enclosing
    ): UnterminatedEnclosedMessage<Fragment, Enclosing> =>
        `${fragment} requires a closing ${enclosing}.`

    type UnterminatedEnclosedMessage<
        Fragment extends string,
        Enclosing extends Parser.Tokens.EnclosedBaseStartChar
    > = `${Fragment} requires a closing ${Enclosing}.`

    const untilLookaheadIsClosing: Record<
        Parser.Tokens.EnclosedBaseStartChar,
        Parser.scanner.UntilCondition
    > = {
        "'": (scanner) => scanner.lookahead === `'`,
        '"': (scanner) => scanner.lookahead === `"`,
        "/": (scanner) => scanner.lookahead === `/`
    }

    export const enclosedBase = (
        s: Parser.state,
        enclosing: Parser.Tokens.EnclosedBaseStartChar
    ) => {
        const enclosed =
            enclosing +
            s.r.shiftUntil(untilLookaheadIsClosing[enclosing], {
                inclusive: true,
                onInputEnd: throwUnterminatedEnclosed
            })
        if (enclosing === "/") {
            s.l.root = new RegexLiteralNode(enclosed as RegexLiteralDefinition)
        } else {
            s.l.root = new StringLiteralNode(
                enclosed as StringLiteralDefinition
            )
        }
        return s
    }

    export type EnclosedBase<
        S extends Parser.State,
        Enclosing extends Parser.Tokens.EnclosedBaseStartChar
    > = S["R"] extends `${Enclosing}${infer Contents}${Enclosing}${infer Rest}`
        ? Parser.State.From<{
              L: Parser.Left.SetRoot<
                  S["L"],
                  `${Enclosing}${Contents}${Enclosing}`
              >
              R: Rest
          }>
        : Parser.State.Error<UnterminatedEnclosedMessage<S["R"], Enclosing>>

    const throwUnterminatedEnclosed: Parser.scanner.OnInputEndFn = (
        scanner,
        shifted
    ) => {
        throw new Error(
            unterminatedEnclosedMessage(
                shifted,
                shifted[0] as Parser.Tokens.EnclosedBaseStartChar
            )
        )
    }

    const lookaheadIsBaseTerminating: Parser.scanner.UntilCondition = (
        scanner
    ) => scanner.lookahead in Parser.Tokens.baseTerminatingChars

    export const unenclosedBase = (s: Parser.state, ctx: Node.context) => {
        const token = s.r.shiftUntil(lookaheadIsBaseTerminating)
        s.l.root = unenclosedToNode(token, ctx)
        return s
    }

    export type UnenclosedBase<
        S extends Parser.State,
        Fragment extends string,
        Unscanned extends string,
        Dict
    > = Unscanned extends Parser.Scanner.Shift<infer Next, infer Rest>
        ? Next extends Parser.Tokens.BaseTerminatingChar
            ? ValidateUnenclosed<S, Fragment, Unscanned, Dict>
            : UnenclosedBase<S, `${Fragment}${Next}`, Rest, Dict>
        : ValidateUnenclosed<S, Fragment, "", Dict>

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

    type ValidateUnenclosed<
        S extends Parser.State,
        Token extends string,
        Unscanned extends string,
        Dict
    > = IsResolvableUnenclosed<Token, Dict> extends true
        ? Parser.State.From<{
              L: Parser.Left.SetRoot<S["L"], Token>
              R: Unscanned
          }>
        : Parser.State.Error<UnresolvableMessage<Token>>

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
}

export type InferTerminalStr<
    Token extends string,
    Ctx extends Node.InferenceContext
> = Token extends Keyword.Definition
    ? Keyword.Types[Token]
    : Token extends keyof Ctx["Space"]["Resolutions"]
    ? AliasType.Infer<Token, Ctx>
    : InferLiteral<Token>

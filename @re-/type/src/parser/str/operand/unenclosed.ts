import { Alias } from "../../../nodes/terminal/alias.js"
import { Keyword } from "../../../nodes/terminal/keyword/keyword.js"
import { PrimitiveLiteral } from "../../../nodes/terminal/primitiveLiteral.js"
import type { ParseError, parserContext, ParserContext } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import { scanner } from "../state/scanner.js"
import { ParserState } from "../state/state.js"
import { UnenclosedBigint, UnenclosedNumber } from "./numeric.js"

export namespace Unenclosed {
    export const parse = (s: ParserState, ctx: parserContext) => {
        const token = s.scanner.shiftUntilNextTerminator()
        s.root = unenclosedToNode(s, token, ctx)
        return s
    }

    export type parse<
        s extends ParserState.T,
        ctx extends ParserContext
    > = Scanner.shiftUntilNextTerminator<
        s["unscanned"]
    > extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
        ? reduce<s, resolve<scanned, nextUnscanned, ctx>>
        : never

    const unenclosedToNode = (
        s: ParserState,
        token: string,
        ctx: parserContext
    ) =>
        maybeParseIdentifier(token, ctx) ??
        maybeParseLiteral(token) ??
        ParserState.error(
            token === ""
                ? scanner.buildExpressionExpectedMessage(s.scanner.unscanned)
                : buildUnresolvableMessage(token)
        )

    const maybeParseIdentifier = (token: string, ctx: parserContext) =>
        Keyword.matches(token)
            ? Keyword.getNode(token)
            : token in ctx.aliases
            ? new Alias.Node(token)
            : undefined

    const maybeParseLiteral = (token: string) => {
        const maybeLiteralValue =
            UnenclosedNumber.maybeParse(token) ??
            (token === "true"
                ? true
                : token === "false"
                ? false
                : UnenclosedBigint.maybeParse(token))
        return maybeLiteralValue
            ? new PrimitiveLiteral.Node(
                  token as
                      | PrimitiveLiteral.Number
                      | PrimitiveLiteral.Bigint
                      | PrimitiveLiteral.Boolean,
                  maybeLiteralValue
              )
            : undefined
    }

    type reduce<
        s extends ParserState.T,
        resolved extends string
    > = resolved extends ParseError<infer Message>
        ? ParserState.error<Message>
        : ParserState.setRoot<s, resolved>

    export const buildUnresolvableMessage = <token extends string>(
        token: token
    ): buildUnresolvableMessage<token> =>
        `'${token}' is not a builtin type or alias`

    type buildUnresolvableMessage<token extends string> =
        `'${token}' is not a builtin type or alias`

    export type isResolvableIdentifier<
        token,
        ctx extends ParserContext
    > = token extends Keyword.Definition
        ? true
        : token extends keyof ctx["aliases"]
        ? true
        : false

    type resolve<
        token extends string,
        unscanned extends string,
        ctx extends ParserContext
    > = isResolvableIdentifier<token, ctx> extends true
        ? token
        : token extends PrimitiveLiteral.Number<infer Value>
        ? UnenclosedNumber.AssertWellFormed<token, Value, "number">
        : token extends PrimitiveLiteral.Boolean
        ? token
        : token extends PrimitiveLiteral.Bigint<infer Value>
        ? UnenclosedBigint.AssertWellFormed<token, Value>
        : ParseError<
              token extends ""
                  ? Scanner.buildExpressionExpectedMessage<unscanned>
                  : buildUnresolvableMessage<token>
          >
}

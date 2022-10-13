import { Alias } from "../../../nodes/terminal/alias.js"
import { Keyword } from "../../../nodes/terminal/keyword.js"
import { PrimitiveLiteral } from "../../../nodes/terminal/primitiveLiteral.js"
import type { ParseError, parserContext, ParserContext } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import { ParserState } from "../state/state.js"
import { UnenclosedBigint, UnenclosedNumber } from "./numeric.js"
import { Operand } from "./operand.js"

export namespace Unenclosed {
    export const parse = (s: ParserState.Base, ctx: parserContext) => {
        const token = s.scanner.shiftUntilNextTerminator()
        s.root = unenclosedToNode(s, token, ctx)
        return s
    }

    export type parse<
        s extends ParserState.T.Unfinished,
        ctx extends ParserContext
    > = Scanner.shiftUntilNextTerminator<
        s["unscanned"]
    > extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
        ? reduce<s, resolve<s, scanned, ctx>, nextUnscanned>
        : never

    const unenclosedToNode = (
        s: ParserState.Base,
        token: string,
        ctx: parserContext
    ) =>
        maybeParseIdentifier(token, ctx) ??
        maybeParseUnenclosedLiteral(token) ??
        ParserState.error(
            token === ""
                ? Operand.buildMissingOperandMessage(s)
                : buildUnresolvableMessage(token)
        )

    export const maybeParseIdentifier = (token: string, ctx: parserContext) =>
        Keyword.matches(token)
            ? Keyword.getNode(token)
            : token in ctx.aliases
            ? new Alias.Node(token)
            : undefined

    const maybeParseUnenclosedLiteral = (token: string) => {
        const maybeLiteralValue =
            UnenclosedNumber.parseWellFormed(token, "number") ??
            (token === "true"
                ? true
                : token === "false"
                ? false
                : UnenclosedBigint.parseWellFormed(token))
        if (maybeLiteralValue !== undefined) {
            return new PrimitiveLiteral.Node(
                token as
                    | PrimitiveLiteral.Number
                    | PrimitiveLiteral.Bigint
                    | PrimitiveLiteral.Boolean,
                maybeLiteralValue
            )
        }
    }

    type reduce<
        s extends ParserState.T.Unfinished,
        resolved extends string,
        unscanned extends string
    > = resolved extends ParseError<infer message>
        ? ParserState.error<message>
        : ParserState.setRoot<s, resolved, unscanned>

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
        s extends ParserState.T.Unfinished,
        token extends string,
        ctx extends ParserContext
    > = isResolvableIdentifier<token, ctx> extends true
        ? token
        : token extends PrimitiveLiteral.Number<infer Value>
        ? UnenclosedNumber.assertWellFormed<token, Value, "number">
        : token extends PrimitiveLiteral.Boolean
        ? token
        : token extends PrimitiveLiteral.Bigint<infer Value>
        ? UnenclosedBigint.assertWellFormed<token, Value>
        : ParseError<
              token extends ""
                  ? Operand.buildMissingOperandMessage<s>
                  : buildUnresolvableMessage<token>
          >
}

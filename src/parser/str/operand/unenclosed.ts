import type { Attributes } from "../../../attributes/attributes.js"
import { isKeyOf } from "../../../utils/generics.js"
import type { ParseError, parserContext, ParserContext } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import { ParserState } from "../state/state.js"
import { Keyword } from "./keyword.js"
import type { BigintLiteral, NumberLiteral } from "./numeric.js"
import { UnenclosedBigint, UnenclosedNumber } from "./numeric.js"
import { Operand } from "./operand.js"

export namespace Unenclosed {
    export const parse = (s: ParserState.Base, ctx: parserContext) => {
        const token = s.scanner.shiftUntilNextTerminator()
        s.root = unenclosedToAttributes(s, token, ctx)
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

    const unenclosedToAttributes = (
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

    export const maybeParseIdentifier = (
        token: string,
        ctx: parserContext
    ): Attributes | undefined =>
        isKeyOf(token, Keyword.attributeMap)
            ? Keyword.attributeMap[token]
            : token in ctx.aliases
            ? { value: "alias" }
            : undefined

    const maybeParseUnenclosedLiteral = (token: string) => {
        const maybeNumber = UnenclosedNumber.parseWellFormed(token, "number")
        if (maybeNumber !== undefined) {
            return { value: maybeNumber }
        }
        const maybeBigint = UnenclosedBigint.parseWellFormed(token)
        if (maybeBigint !== undefined) {
            return { value: maybeBigint }
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
    > = token extends Keyword
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
        : token extends NumberLiteral<infer Value>
        ? UnenclosedNumber.assertWellFormed<token, Value, "number">
        : token extends BigintLiteral<infer Value>
        ? UnenclosedBigint.assertWellFormed<token, Value>
        : ParseError<
              token extends ""
                  ? Operand.buildMissingOperandMessage<s>
                  : buildUnresolvableMessage<token>
          >
}

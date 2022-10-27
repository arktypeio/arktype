import { Attributes } from "../../../attributes/attributes.js"
import type {
    ParseError,
    ParserContext,
    StaticParserContext
} from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import { ParserState } from "../state/state.js"
import { Keyword } from "./keyword.js"
import type { BigintLiteral, NumberLiteral } from "./numeric.js"
import { UnenclosedBigint, UnenclosedNumber } from "./numeric.js"
import { Operand } from "./operand.js"

export namespace Unenclosed {
    export const parse = (s: ParserState.Base, context: ParserContext) => {
        const token = s.scanner.shiftUntilNextTerminator()
        s.root = unenclosedToAttributes(s, token, context)
        return s
    }

    export type parse<
        s extends ParserState.T.Unfinished,
        context extends StaticParserContext
    > = Scanner.shiftUntilNextTerminator<
        s["unscanned"]
    > extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
        ? reduce<s, resolve<s, scanned, context>, nextUnscanned>
        : never

    const unenclosedToAttributes = (
        s: ParserState.Base,
        token: string,
        context: ParserContext
    ) =>
        maybeParseIdentifier(token, context) ??
        maybeParseUnenclosedLiteral(token) ??
        ParserState.error(
            token === ""
                ? Operand.buildMissingOperandMessage(s)
                : buildUnresolvableMessage(token)
        )

    export const maybeParseIdentifier = (
        token: string,
        context: ParserContext
    ): Attributes | undefined =>
        Keyword.matches(token)
            ? Keyword.getNode(token)
            : token in context.aliases
            ? Attributes.init("value", "alias")
            : undefined

    const maybeParseUnenclosedLiteral = (token: string) => {
        const maybeNumber = UnenclosedNumber.parseWellFormed(token, "number")
        if (maybeNumber !== undefined) {
            return Attributes.init("value", maybeNumber)
        }
        const maybeBigint = UnenclosedBigint.parseWellFormed(token)
        if (maybeBigint !== undefined) {
            return Attributes.init("value", maybeBigint)
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
        context extends StaticParserContext
    > = token extends Keyword
        ? true
        : token extends keyof context["aliases"]
        ? true
        : false

    type resolve<
        s extends ParserState.T.Unfinished,
        token extends string,
        context extends StaticParserContext
    > = isResolvableIdentifier<token, context> extends true
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

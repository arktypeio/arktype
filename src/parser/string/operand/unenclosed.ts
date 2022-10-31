import type { Attributes } from "../../../attributes/shared.js"
import type {
    ParseError,
    ParserContext,
    StaticParserContext
} from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import type { StaticState } from "../state/state.js"
import { DynamicState } from "../state/state.js"
import { Keyword } from "./keyword.js"
import type { BigintLiteral, NumberLiteral } from "./numeric.js"
import { UnenclosedBigint, UnenclosedNumber } from "./numeric.js"
import { Operand } from "./operand.js"

export namespace Unenclosed {
    export const parse = (s: DynamicState, context: ParserContext) => {
        const token = s.scanner.shiftUntilNextTerminator()
        s.root = unenclosedToAttributes(s, token, context)
        return s
    }

    export type parse<
        s extends StaticState,
        context extends StaticParserContext
    > = Scanner.shiftUntilNextTerminator<
        s["unscanned"]
    > extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
        ? reduce<s, resolve<s, scanned, context>, nextUnscanned>
        : never

    const unenclosedToAttributes = (
        s: DynamicState,
        token: string,
        context: ParserContext
    ) =>
        maybeParseIdentifier(token, context) ??
        maybeParseUnenclosedLiteral(token) ??
        DynamicState.error(
            token === ""
                ? Operand.buildMissingOperandMessage(s)
                : buildUnresolvableMessage(token)
        )

    export const maybeParseIdentifier = (
        token: string,
        context: ParserContext
    ): Attributes | undefined =>
        Keyword.matches(token)
            ? Keyword.attributesOf(token)
            : token in context.aliases
            ? ({ value: "alias" } as const)
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
        s extends StaticState,
        resolved extends string,
        unscanned extends string
    > = resolved extends ParseError<infer message>
        ? StaticState.error<message>
        : StaticState.setRoot<s, resolved, unscanned>

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
        s extends StaticState,
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

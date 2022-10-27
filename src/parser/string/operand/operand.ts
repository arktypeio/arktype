import type { ParserContext, StaticParserContext } from "../../common.js"
import { throwParseError } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import type { StaticState } from "../state/state.js"
import { DynamicState } from "../state/state.js"
import { Enclosed } from "./enclosed.js"
import { GroupOpen } from "./groupOpen.js"
import { Unenclosed } from "./unenclosed.js"

export namespace Operand {
    export const parse = (
        s: DynamicState,
        context: ParserContext
    ): DynamicState =>
        s.scanner.lookahead === ""
            ? throwParseError(buildMissingOperandMessage(s))
            : s.scanner.lookahead === "("
            ? GroupOpen.parse(DynamicState.shifted(s))
            : s.scanner.lookaheadIsIn(Enclosed.startChars)
            ? Enclosed.parse(s, s.scanner.shift())
            : s.scanner.lookahead === " "
            ? parse(DynamicState.shifted(s), context)
            : Unenclosed.parse(s, context)

    export type parse<
        s extends StaticState,
        context extends StaticParserContext
    > = s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
        ? lookahead extends "("
            ? GroupOpen.parse<s, unscanned>
            : lookahead extends Enclosed.StartChar
            ? Enclosed.parse<s, lookahead, unscanned>
            : lookahead extends " "
            ? parse<StaticState.scanTo<s, unscanned>, context>
            : Unenclosed.parse<s, context>
        : StaticState.error<buildMissingOperandMessage<s>>

    export const buildMissingOperandMessage = <s extends DynamicState>(
        s: s
    ) => {
        const previousOperator = DynamicState.previousOperator(s)
        return previousOperator === null
            ? buildExpressionExpectedMessage(s.scanner.unscanned)
            : buildMissingRightOperandMessage(
                  previousOperator,
                  s.scanner.unscanned
              )
    }

    export type buildMissingOperandMessage<
        s extends StaticState,
        previousOperator extends Scanner.InfixToken | null = StaticState.previousOperator<s>
    > = previousOperator extends {}
        ? buildMissingRightOperandMessage<previousOperator, s["unscanned"]>
        : buildExpressionExpectedMessage<s["unscanned"]>

    export type buildMissingRightOperandMessage<
        token extends Scanner.InfixToken,
        unscanned extends string
    > = `Token '${token}' requires a right operand${unscanned extends ""
        ? ""
        : ` before '${unscanned}'`}`

    export const buildMissingRightOperandMessage = <
        token extends Scanner.InfixToken,
        unscanned extends string
    >(
        token: token,
        unscanned: unscanned
    ): buildMissingRightOperandMessage<token, unscanned> =>
        `Token '${token}' requires a right operand${
            unscanned ? "" : (` before '${unscanned}'` as any)
        }`

    export const buildExpressionExpectedMessage = <unscanned extends string>(
        unscanned: unscanned
    ) =>
        `Expected an expression${
            unscanned ? ` before '${unscanned}'` : ""
        }` as buildExpressionExpectedMessage<unscanned>

    export type buildExpressionExpectedMessage<unscanned extends string> =
        `Expected an expression${unscanned extends ""
            ? ""
            : ` before '${unscanned}'`}`
}

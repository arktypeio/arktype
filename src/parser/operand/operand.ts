import type { StaticParserContext } from "../common.js"
import { throwParseError } from "../common.js"
import type { Scanner } from "../state/scanner.js"
import { State } from "../state/state.js"
import { Enclosed } from "./enclosed.js"
import { GroupOpen } from "./groupOpen.js"
import { Unenclosed } from "./unenclosed.js"

export namespace Operand {
    export const parse = (s: State.Dynamic): State.Dynamic =>
        s.scanner.lookahead === ""
            ? throwParseError(buildMissingOperandMessage(s))
            : s.scanner.lookahead === "("
            ? GroupOpen.parse(State.shifted(s))
            : s.scanner.lookaheadIsIn(Enclosed.startChars)
            ? Enclosed.parse(s, s.scanner.shift())
            : s.scanner.lookahead === " "
            ? parse(State.shifted(s))
            : Unenclosed.parse(s)

    export type parse<
        s extends State.Static,
        context extends StaticParserContext
    > = s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
        ? lookahead extends "("
            ? GroupOpen.parse<s, unscanned>
            : lookahead extends Enclosed.StartChar
            ? Enclosed.parse<s, lookahead, unscanned>
            : lookahead extends " "
            ? parse<State.scanTo<s, unscanned>, context>
            : Unenclosed.parse<s, context>
        : State.error<buildMissingOperandMessage<s>>

    export const buildMissingOperandMessage = <s extends State.Dynamic>(
        s: s
    ) => {
        const previousOperator = State.previousOperator(s)
        return previousOperator
            ? buildMissingRightOperandMessage(
                  previousOperator,
                  s.scanner.unscanned
              )
            : buildExpressionExpectedMessage(s.scanner.unscanned)
    }

    export type buildMissingOperandMessage<
        s extends State.Static,
        previousOperator extends
            | Scanner.InfixToken
            | undefined = State.previousOperator<s>
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

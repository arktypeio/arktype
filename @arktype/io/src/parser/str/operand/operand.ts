import type { Branching } from "../../../nodes/branching/branching.js"
import type { Bound } from "../../../nodes/unary/bound.js"
import type { parserContext, ParserContext } from "../../common.js"
import { throwParseError } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import { ParserState } from "../state/state.js"
import { Enclosed } from "./enclosed.js"
import { GroupOpen } from "./groupOpen.js"
import { Unenclosed } from "./unenclosed.js"

export namespace Operand {
    export const parse = (
        s: ParserState.Base,
        ctx: parserContext
    ): ParserState.Base =>
        s.scanner.lookahead === ""
            ? throwParseError(buildMissingOperandMessage(s))
            : s.scanner.lookahead === "("
            ? GroupOpen.reduce(ParserState.shifted(s))
            : s.scanner.lookaheadIsIn(Enclosed.startChars)
            ? Enclosed.parse(s, s.scanner.shift())
            : s.scanner.lookahead === " "
            ? parse(ParserState.shifted(s), ctx)
            : Unenclosed.parse(s, ctx)

    export type parse<
        s extends ParserState.T.Unfinished,
        ctx extends ParserContext
    > = s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
        ? lookahead extends "("
            ? GroupOpen.reduce<s, unscanned>
            : lookahead extends Enclosed.StartChar
            ? Enclosed.parse<s, lookahead, unscanned>
            : lookahead extends " "
            ? parse<ParserState.scanTo<s, unscanned>, ctx>
            : Unenclosed.parse<s, ctx>
        : ParserState.error<buildMissingOperandMessage<s>>

    export const buildMissingOperandMessage = <s extends ParserState.Base>(
        s: s
    ) => {
        const lastOperator = ParserState.lastOperator(s)
        return lastOperator === null
            ? buildExpressionExpectedMessage(s.scanner.unscanned)
            : buildMissingRightOperandMessage(lastOperator, s.scanner.unscanned)
    }

    type InfixToken = Branching.Token | Bound.Token | "%"

    export type buildMissingOperandMessage<
        s extends ParserState.T.Unfinished,
        lastOperator extends InfixToken | null = ParserState.lastOperator<s>
    > = lastOperator extends {}
        ? buildMissingRightOperandMessage<lastOperator, s["unscanned"]>
        : buildExpressionExpectedMessage<s["unscanned"]>

    export type buildMissingRightOperandMessage<
        token extends InfixToken,
        unscanned extends string
    > = `Token '${token}' requires a right operand${unscanned extends ""
        ? ""
        : ` before '${unscanned}'`}`

    export const buildMissingRightOperandMessage = <
        token extends InfixToken,
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

import type { parserContext, ParserContext } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import { parserState } from "../state/state.js"
import type { ParserState } from "../state/state.js"
import { Enclosed } from "./enclosed.js"
import { GroupOpen } from "./groupOpen.js"
import { Unenclosed } from "./unenclosed.js"

export namespace Operand {
    export const parse = (s: parserState, ctx: parserContext): parserState =>
        s.scanner.lookahead === "("
            ? GroupOpen.reduce(parserState.shifted(s))
            : s.scanner.lookaheadIsIn(Enclosed.startChars)
            ? Enclosed.parse(s, s.scanner.shift())
            : s.scanner.lookahead === " "
            ? parse(parserState.shifted(s), ctx)
            : Unenclosed.parse(s, ctx)

    export type parse<
        s extends ParserState,
        ctx extends ParserContext
    > = s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
        ? lookahead extends "("
            ? GroupOpen.reduce<s, unscanned>
            : lookahead extends Enclosed.StartChar
            ? Enclosed.parse<s, lookahead, unscanned>
            : lookahead extends " "
            ? parse<ParserState.scanTo<s, unscanned>, ctx>
            : Unenclosed.parse<s, ctx>
        : ParserState.error<Scanner.buildExpressionExpectedMessage<"">>
}

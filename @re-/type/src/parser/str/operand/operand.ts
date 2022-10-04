import type { parserContext, ParserContext } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import type { ParserState, parserState } from "../state/state.js"
import { Enclosed } from "./enclosed.js"
import { GroupOpen } from "./groupOpen.js"
import { Unenclosed } from "./unenclosed.js"

export namespace Operand {
    export const parse = (s: parserState, ctx: parserContext): parserState =>
        s.r.lookahead === "("
            ? GroupOpen.reduce(s.shifted())
            : s.r.lookaheadIsIn(Enclosed.startChars)
            ? Enclosed.parse(s, s.r.shift())
            : s.r.lookahead === " "
            ? parse(s.shifted(), ctx)
            : Unenclosed.parse(s, ctx)

    export type Parse<
        S extends ParserState,
        Ctx extends ParserContext
    > = S["R"] extends Scanner.Shift<infer Lookahead, infer Unscanned>
        ? Lookahead extends "("
            ? ParserState.From<{
                  L: GroupOpen.Reduce<S["L"]>
                  R: Unscanned
              }>
            : Lookahead extends Enclosed.StartChar
            ? Enclosed.Parse<S, Lookahead, Unscanned>
            : Lookahead extends " "
            ? Parse<{ L: S["L"]; R: Unscanned }, Ctx>
            : Unenclosed.Parse<S, Ctx>
        : ParserState.Error<Scanner.ExpressionExpectedMessage<"">>
}

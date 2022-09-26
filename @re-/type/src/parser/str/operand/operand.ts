import type { ParserContext, parserContext } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import type { ParserState, parserState } from "../state/state.js"
import type { ExpressionExpectedMessage } from "./common.js"
import { expressionExpectedMessage } from "./common.js"
import type { EnclosedBaseStartChar, ParseEnclosedBase } from "./enclosed.js"
import { enclosedBaseStartChars, parseEnclosedBase } from "./enclosed.js"
import type { ReduceGroupOpen } from "./groupOpen.js"
import { reduceGroupOpen } from "./groupOpen.js"
import type { ParseUnenclosedBase } from "./unenclosed.js"
import { parseUnenclosedBase } from "./unenclosed.js"

export const parseOperand = (
    s: parserState,
    context: parserContext
): parserState =>
    s.r.lookahead === "("
        ? reduceGroupOpen(s.shifted())
        : s.r.lookaheadIsIn(enclosedBaseStartChars)
        ? parseEnclosedBase(s, s.r.shift(), context)
        : s.r.lookahead === " "
        ? parseOperand(s.shifted(), context)
        : s.r.lookahead === "END"
        ? s.error(expressionExpectedMessage(""))
        : parseUnenclosedBase(s, context)

export type ParseOperand<
    S extends ParserState,
    Ctx extends ParserContext
> = S["R"] extends Scanner.Shift<infer Lookahead, infer Unscanned>
    ? Lookahead extends "("
        ? ParserState.From<{
              L: ReduceGroupOpen<S["L"]>
              R: Unscanned
          }>
        : Lookahead extends EnclosedBaseStartChar
        ? ParseEnclosedBase<S, Lookahead>
        : Lookahead extends " "
        ? ParseOperand<{ L: S["L"]; R: Unscanned }, Ctx>
        : ParseUnenclosedBase<S, "", S["R"], Ctx>
    : ParserState.Error<ExpressionExpectedMessage<"">>

import type { DynamicState } from "../../reduce/dynamic.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { BaseCompletions } from "../../string.js"
import { Scanner } from "../scanner.js"
import type { EnclosingChar } from "./enclosed.js"
import { enclosingChar, parseEnclosed } from "./enclosed.js"
import { parseUnenclosed, writeMissingOperandMessage } from "./unenclosed.js"

export const parseOperand = (s: DynamicState): void =>
    s.scanner.lookahead === ""
        ? s.error(writeMissingOperandMessage(s))
        : s.scanner.lookahead === "("
        ? s.shiftedByOne().reduceGroupOpen()
        : s.scanner.lookaheadIsIn(enclosingChar)
        ? parseEnclosed(s, s.scanner.shift())
        : s.scanner.lookaheadIsIn(Scanner.whiteSpaceTokens)
        ? parseOperand(s.shiftedByOne())
        : parseUnenclosed(s)

export type parseOperand<
    s extends StaticState,
    $,
    args
> = s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
    ? lookahead extends "("
        ? state.reduceGroupOpen<s, unscanned>
        : lookahead extends EnclosingChar
        ? parseEnclosed<s, lookahead, unscanned>
        : lookahead extends Scanner.WhiteSpaceToken
        ? parseOperand<state.scanTo<s, unscanned>, $, args>
        : parseUnenclosed<s, $, args>
    : state.error<`${s["scanned"]}${BaseCompletions<$, args>}`>

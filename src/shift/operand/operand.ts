import type { DynamicState } from "../../reduce/dynamic.js"
import type { Scanner } from "../../reduce/scanner.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { EnclosingChar } from "./enclosed.js"
import { enclosingChar, parseEnclosed } from "./enclosed.js"
import { buildMissingOperandMessage, parseUnenclosed } from "./unenclosed.js"

export const parseOperand = (s: DynamicState): void =>
    s.scanner.lookahead === ""
        ? s.error(buildMissingOperandMessage(s))
        : s.scanner.lookahead === "("
        ? s.reduceGroupOpen()
        : s.scanner.lookaheadIsIn(enclosingChar)
        ? parseEnclosed(s, s.scanner.shift())
        : s.scanner.lookahead === " "
        ? parseOperand(s.shiftedByOne())
        : parseUnenclosed(s)

export type parseOperand<
    s extends StaticState,
    alias extends string
> = s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
    ? lookahead extends "("
        ? state.reduceGroupOpen<s, unscanned>
        : lookahead extends EnclosingChar
        ? parseEnclosed<s, lookahead, unscanned>
        : lookahead extends " "
        ? parseOperand<state.scanTo<s, unscanned>, alias>
        : parseUnenclosed<s, alias>
    : state.throws<buildMissingOperandMessage<s>>

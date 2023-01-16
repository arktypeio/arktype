import type { error } from "../../../../utils/generics.ts"
import type { DynamicState } from "../../reduce/dynamic.ts"
import type { state, StaticState } from "../../reduce/static.ts"
import type { Scanner } from "../scanner.ts"
import type { EnclosingChar } from "./enclosed.ts"
import { enclosingChar, parseEnclosed } from "./enclosed.ts"
import { parseUnenclosed, writeMissingOperandMessage } from "./unenclosed.ts"

export const parseOperand = (s: DynamicState): void =>
    s.scanner.lookahead === ""
        ? s.error(writeMissingOperandMessage(s))
        : s.scanner.lookahead === "("
        ? s.shiftedByOne().reduceGroupOpen()
        : s.scanner.lookaheadIsIn(enclosingChar)
        ? parseEnclosed(s, s.scanner.shift())
        : parseUnenclosed(s)

// TODO: try adding aliases string extends where possible
export type parseOperand<
    s extends StaticState,
    $
> = s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
    ? lookahead extends "("
        ? state.reduceGroupOpen<s, unscanned>
        : lookahead extends EnclosingChar
        ? parseEnclosed<s, lookahead, unscanned>
        : parseUnenclosed<s, $>
    : error<writeMissingOperandMessage<s>>

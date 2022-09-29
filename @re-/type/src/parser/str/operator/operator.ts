import { isKeyOf } from "@re-/tools"
import type { parserContext } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import type { ParserState, parserState } from "../state/state.js"
import { parseArray } from "./array.js"
import type { ParseArray } from "./array.js"
import type { ReduceGroupClose } from "./groupClose.js"
import { reduceGroupClose } from "./groupClose.js"
import type { ReduceIntersection } from "./intersection.js"
import { reduceIntersection } from "./intersection.js"
import type { ParseModulo } from "./modulo.js"
import { parseModulo } from "./modulo.js"
import type { FinalizeOptional } from "./optional.js"
import { finalizeOptional } from "./optional.js"
import type { ComparatorChar } from "./unary/comparator/common.js"
import { comparatorChars } from "./unary/comparator/common.js"
import type { ParseBound } from "./unary/comparator/parse.js"
import { parseBound } from "./unary/comparator/parse.js"
import { reduceUnion } from "./union.js"
import type { ReduceUnion } from "./union.js"

export const parseOperator = (
    s: parserState.withRoot,
    ctx: parserContext
): parserState => {
    const lookahead = s.r.shift()
    return lookahead === "END"
        ? s.finalize()
        : lookahead === "?"
        ? finalizeOptional(s, ctx)
        : lookahead === "["
        ? parseArray(s, ctx)
        : lookahead === "|"
        ? reduceUnion(s, ctx)
        : lookahead === "&"
        ? reduceIntersection(s, ctx)
        : lookahead === ")"
        ? reduceGroupClose(s)
        : isKeyOf(lookahead, comparatorChars)
        ? parseBound(s, lookahead)
        : lookahead === "%"
        ? parseModulo(s)
        : lookahead === " "
        ? parseOperator(s, ctx)
        : s.error(unexpectedCharacterMessage(lookahead))
}

export type ParseOperator<S extends ParserState> = S["R"] extends Scanner.Shift<
    infer Lookahead,
    infer Unscanned
>
    ? Lookahead extends "?"
        ? FinalizeOptional<S>
        : Lookahead extends "["
        ? ParseArray<S, Unscanned>
        : Lookahead extends "|"
        ? ParserState.From<{
              L: ReduceUnion<S["L"], Unscanned>
              R: Unscanned
          }>
        : Lookahead extends "&"
        ? ParserState.From<{
              L: ReduceIntersection<S["L"], Unscanned>
              R: Unscanned
          }>
        : Lookahead extends ")"
        ? ParserState.From<{
              L: ReduceGroupClose<S["L"], Unscanned>
              R: Unscanned
          }>
        : Lookahead extends ComparatorChar
        ? ParseBound<S, Lookahead, Unscanned>
        : Lookahead extends "%"
        ? ParseModulo<S, Unscanned>
        : Lookahead extends " "
        ? ParseOperator<{ L: S["L"]; R: Unscanned }>
        : ParserState.Error<UnexpectedCharacterMessage<Lookahead>>
    : ParserState.Finalize<S, false>

const unexpectedCharacterMessage = <Char extends string>(
    char: Char
): UnexpectedCharacterMessage<Char> => `Unexpected character '${char}'.`

type UnexpectedCharacterMessage<Char extends string> =
    `Unexpected character '${Char}'.`

import { isKeyOf } from "@re-/tools"
import type { parserContext } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import type { ParserState, parserState } from "../state/state.js"
import type { ReduceIntersection } from "./binary/intersection.js"
import { reduceIntersection } from "./binary/intersection.js"
import type { ReduceUnion } from "./binary/union.js"
import { reduceUnion } from "./binary/union.js"
import type { ReduceGroupClose } from "./groupClose.js"
import { reduceGroupClose } from "./groupClose.js"
import { parseArray } from "./unary/array.js"
import type { ParseArray } from "./unary/array.js"
import type { ComparatorChar } from "./unary/bound/common.js"
import { comparatorChars } from "./unary/bound/common.js"
import type { ParseBound } from "./unary/bound/parse.js"
import { parseBound } from "./unary/bound/parse.js"
import type { ParseModulo } from "./unary/modulo.js"
import { parseModulo } from "./unary/modulo.js"
import type { FinalizeOptional } from "./unary/optional.js"
import { finalizeOptional } from "./unary/optional.js"

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

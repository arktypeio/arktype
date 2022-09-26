import { isKeyOf } from "@re-/tools"
import { LiteralNode } from "../../../../../nodes/terminals/literal.js"
import type { NumberLiteralDefinition } from "../../../../../nodes/terminals/literal.js"
import type { Left } from "../../../state/left.js"
import type { Scanner } from "../../../state/scanner.js"
import type { parserState, ParserState } from "../../../state/state.js"
import type { ComparatorChar, SingleCharComparator } from "./common.js"
import { singleCharComparator } from "./common.js"
import type { ReduceLeft } from "./left.js"
import { reduceLeft } from "./left.js"

export const parseBound = (s: parserState.withRoot, start: ComparatorChar) =>
    reduceBound(s, shiftComparator(s, start))

export const shiftComparator = (
    s: parserState.withRoot,
    start: ComparatorChar
): Scanner.Comparator =>
    s.r.lookaheadIs("=")
        ? `${start}${s.r.shift()}`
        : isKeyOf(start, singleCharComparator)
        ? start
        : s.error(singleEqualsMessage)

export type ParseBound<
    S extends ParserState,
    Start extends ComparatorChar,
    Unscanned extends string
> = Unscanned extends Scanner.Shift<"=", infer NextUnscanned>
    ? ParserState.From<{
          L: ReduceBound<S["L"], `${Start}=`>
          R: NextUnscanned
      }>
    : Start extends SingleCharComparator
    ? ParserState.From<{ L: ReduceBound<S["L"], Start>; R: Unscanned }>
    : ParserState.Error<SingleEqualsMessage>

export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
type SingleEqualsMessage = typeof singleEqualsMessage

export const reduceBound = (
    s: parserState.withRoot,
    token: Scanner.Comparator
) =>
    s.hasRoot(LiteralNode) && typeof s.l.root.value === "number"
        ? reduceLeft(s, token)
        : s.suffixed(token)

export type ReduceBound<
    L extends Left,
    Token extends Scanner.Comparator
> = L extends {
    root: NumberLiteralDefinition<infer Value>
}
    ? ReduceLeft<L, Value, Token>
    : Left.SetNextSuffix<L, Token>

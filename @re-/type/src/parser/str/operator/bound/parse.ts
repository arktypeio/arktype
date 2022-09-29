import { isKeyOf } from "@re-/tools"
import { LiteralNode } from "../../../../../nodes/terminal/literal.js"
import type { NumberLiteralDefinition } from "../../../../../nodes/terminal/literal.js"
import type { Scanner } from "../../../state/scanner.js"
import type { parserState, ParserState } from "../../../state/state.js"
import type {
    Comparator,
    ComparatorChar,
    SingleCharComparator
} from "./common.js"
import { singleCharComparator } from "./common.js"
import type { ReduceLeft } from "./left.js"
import { reduceLeft } from "./left.js"
import type { ParseRightBound } from "./right.js"
import { parseRightBound } from "./right.js"

export const parseBound = (s: parserState.withRoot, start: ComparatorChar) =>
    reduceBound(s, shiftComparator(s, start))

export const shiftComparator = (
    s: parserState.withRoot,
    start: ComparatorChar
): Comparator =>
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
    ? DelegateBoundReduction<S, `${Start}=`, NextUnscanned>
    : Start extends SingleCharComparator
    ? DelegateBoundReduction<S, Start, Unscanned>
    : ParserState.Error<SingleEqualsMessage>

export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
type SingleEqualsMessage = typeof singleEqualsMessage

export const reduceBound = (s: parserState.withRoot, token: Comparator) =>
    s.hasRoot(LiteralNode) && typeof s.l.root.value === "number"
        ? reduceLeft(s, token)
        : parseRightBound(s, token)

export type DelegateBoundReduction<
    S extends ParserState,
    Token extends Comparator,
    Unscanned extends string
> = S["L"]["root"] extends NumberLiteralDefinition<infer Value>
    ? ParserState.From<{ L: ReduceLeft<S["L"], Value, Token>; R: Unscanned }>
    : ParseRightBound<{ L: S["L"]; R: Unscanned }, Token>

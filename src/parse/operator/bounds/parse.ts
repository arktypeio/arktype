import { isKeyOf } from "../../../utils/generics.js"
import type { DynamicState } from "../../state/dynamic.js"
import { Scanner } from "../../state/scanner.js"
import type { state, StaticWithRoot } from "../../state/static.js"
import { parseLeftBound } from "./left.js"
import { parseRightBound } from "./right.js"
import type { buildInvalidDoubleBoundMessage } from "./shared.js"

const shift = (
    s: DynamicState,
    start: Scanner.ComparatorStartChar
): Scanner.Comparator =>
    s.scanner.lookaheadIs("=")
        ? `${start}${s.scanner.shift()}`
        : isKeyOf(start, Scanner.oneCharComparators)
        ? start
        : s.error(singleEqualsMessage)

export const parseBound = (
    s: DynamicState,
    start: Scanner.ComparatorStartChar
) => delegateReduction(s, shift(s, start))

export type parseBound<
    s extends StaticWithRoot,
    start extends Scanner.ComparatorStartChar,
    unscanned extends string
> = unscanned extends Scanner.shift<"=", infer nextUnscanned>
    ? delegateReduction<state.scanTo<s, nextUnscanned>, `${start}=`>
    : start extends Scanner.OneCharComparator
    ? delegateReduction<state.scanTo<s, unscanned>, start>
    : state.error<singleEqualsMessage>

export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality`
type singleEqualsMessage = typeof singleEqualsMessage

const delegateReduction = (s: DynamicState, comparator: Scanner.Comparator) =>
    true ? parseLeftBound(s, comparator) : parseRightBound(s, comparator)

type delegateReduction<
    s extends StaticWithRoot,
    comparator extends Scanner.Comparator
> = s["root"] extends number
    ? comparator extends Scanner.PairableComparator
        ? state.reduceOpenRange<s, s["root"], comparator>
        : state.error<buildInvalidDoubleBoundMessage<comparator>>
    : parseRightBound<s, comparator>

import { isKeyOf } from "../../../utils/generics.js"
import { Scanner } from "../../state/scanner.js"
import type {
    DynamicWithRoot,
    scanStateTo,
    StaticWithRoot
} from "../../state/static.js"
import { errorState, rootValueHasSerializedType } from "../../state/static.js"
import { parseLeftBound } from "./left.js"
import { parseRightBound } from "./right.js"

const shift = (
    s: DynamicWithRoot,
    start: Scanner.ComparatorStartChar
): Scanner.Comparator =>
    s.scanner.lookaheadIs("=")
        ? `${start}${s.scanner.shift()}`
        : isKeyOf(start, Scanner.oneCharComparators)
        ? start
        : errorState(singleEqualsMessage)

export const parseBound = (
    s: DynamicWithRoot,
    start: Scanner.ComparatorStartChar
) => delegateReduction(s, shift(s, start))

export type parseBound<
    s extends StaticWithRoot,
    start extends Scanner.ComparatorStartChar,
    unscanned extends string
> = unscanned extends Scanner.shift<"=", infer nextUnscanned>
    ? delegateReduction<scanStateTo<s, nextUnscanned>, `${start}=`>
    : start extends Scanner.OneCharComparator
    ? delegateReduction<scanStateTo<s, unscanned>, start>
    : errorState<singleEqualsMessage>

export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality`
type singleEqualsMessage = typeof singleEqualsMessage

const delegateReduction = (
    s: DynamicWithRoot,
    comparator: Scanner.Comparator
) =>
    rootValueHasSerializedType(s, "number")
        ? parseLeftBound(s, comparator)
        : parseRightBound(s, comparator)

type delegateReduction<
    s extends StaticWithRoot,
    comparator extends Scanner.Comparator
> = s extends {
    root: number
}
    ? parseLeftBound<s, comparator>
    : parseRightBound<s, comparator>

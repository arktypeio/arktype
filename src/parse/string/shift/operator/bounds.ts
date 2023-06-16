import { Disjoint } from "../../../../nodes/disjoint.js"
import type {
    Comparator,
    MaxComparator
} from "../../../../nodes/primitive/range.js"
import { maxComparators, rangeNode } from "../../../../nodes/primitive/range.js"
import type { NumberLiteral } from "../../../../../dev/utils/numericLiterals.js"
import { tryParseWellFormedNumber } from "../../../../../dev/utils/numericLiterals.js"
import type { keySet } from "../../../../../dev/utils/records.js"
import { isKeyOf } from "../../../../../dev/utils/records.js"
import type {
    DynamicState,
    DynamicStateWithRoot
} from "../../reduce/dynamic.js"
import { writeUnpairableComparatorMessage } from "../../reduce/shared.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { Scanner } from "../scanner.js"

export const parseBound = (
    s: DynamicStateWithRoot,
    start: ComparatorStartChar
) => {
    const comparator = shiftComparator(s, start)
    const value = s.root.valueNode?.rule
    if (typeof value === "number") {
        s.ejectRoot()
        return s.reduceLeftBound(value, comparator)
    }
    return parseRightBound(s, comparator)
}

export type parseBound<
    s extends StaticState,
    start extends ComparatorStartChar,
    unscanned extends string
> = shiftComparator<start, unscanned> extends infer shiftResultOrError
    ? shiftResultOrError extends Scanner.shiftResult<
          infer comparator extends Comparator,
          infer nextUnscanned
      >
        ? s["root"] extends NumberLiteral
            ? state.reduceLeftBound<s, s["root"], comparator, nextUnscanned>
            : parseRightBound<s, comparator, nextUnscanned>
        : shiftResultOrError
    : never

const oneCharComparators = {
    "<": true,
    ">": true
} as const

type OneCharComparator = keyof typeof oneCharComparators

export type ComparatorStartChar = Comparator extends `${infer char}${string}`
    ? char
    : never

export const comparatorStartChars: keySet<ComparatorStartChar> = {
    "<": true,
    ">": true,
    "=": true
}

const shiftComparator = (
    s: DynamicState,
    start: ComparatorStartChar
): Comparator =>
    s.scanner.lookaheadIs("=")
        ? `${start}${s.scanner.shift()}`
        : isKeyOf(start, oneCharComparators)
        ? start
        : s.error(singleEqualsMessage)

type shiftComparator<
    start extends ComparatorStartChar,
    unscanned extends string
> = unscanned extends `=${infer nextUnscanned}`
    ? [`${start}=`, nextUnscanned]
    : start extends OneCharComparator
    ? [start, unscanned]
    : state.error<singleEqualsMessage>

export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality`
type singleEqualsMessage = typeof singleEqualsMessage

export const parseRightBound = (
    s: DynamicStateWithRoot,
    comparator: Comparator
) => {
    const limitToken = s.scanner.shiftUntilNextTerminator()
    const limit = tryParseWellFormedNumber(
        limitToken,
        writeInvalidLimitMessage(comparator, limitToken + s.scanner.unscanned)
    )
    if (!s.branches.range) {
        s.root = s.root.constrain("range", [{ comparator, limit }])
        return
    }
    if (!isKeyOf(comparator, maxComparators)) {
        return s.error(writeUnpairableComparatorMessage(comparator))
    }
    const intersectionResult = s.branches.range.intersect(
        rangeNode([{ comparator, limit }])
    )
    if (intersectionResult instanceof Disjoint) {
        return intersectionResult.throw()
    }
    s.root = s.root.constrain("range", intersectionResult.rule)
    delete s.branches.range
}

export type parseRightBound<
    s extends StaticState,
    comparator extends Comparator,
    unscanned extends string
> = Scanner.shiftUntilNextTerminator<
    Scanner.skipWhitespace<unscanned>
> extends Scanner.shiftResult<infer scanned, infer nextUnscanned>
    ? scanned extends NumberLiteral
        ? s["branches"]["range"] extends {}
            ? comparator extends MaxComparator
                ? state.reduceRange<
                      s,
                      s["branches"]["range"]["limit"],
                      s["branches"]["range"]["comparator"],
                      comparator,
                      scanned,
                      nextUnscanned
                  >
                : state.error<writeUnpairableComparatorMessage<comparator>>
            : state.reduceSingleBound<s, comparator, scanned, nextUnscanned>
        : never
    : never

export const writeInvalidLimitMessage = <
    comparator extends Comparator,
    limit extends string
>(
    comparator: comparator,
    limit: limit
): writeInvalidLimitMessage<comparator, limit> =>
    `Comparator ${comparator} must be followed by a number literal (was '${limit}')`

export type writeInvalidLimitMessage<
    comparator extends Comparator,
    limit extends string
> = `Comparator ${comparator} must be followed by a number literal (was '${limit}')`

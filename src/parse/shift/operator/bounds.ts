import type { AttributeBranches } from "../../../attributes/attributes.js"
import type { Bound, Bounds } from "../../../attributes/bounds.js"
import type { error } from "../../../utils/generics.js"
import { isKeyOf } from "../../../utils/generics.js"
import { tryParseWellFormedNumber } from "../../../utils/numericLiterals.js"
import type { DynamicState } from "../../reduce/dynamic.js"
import { Scanner } from "../../reduce/scanner.js"
import { buildUnpairableComparatorMessage } from "../../reduce/shared.js"
import type { state, StaticState } from "../../reduce/static.js"

export const parseBound = (
    s: DynamicState,
    start: Scanner.ComparatorStartChar
) => {
    const comparator = shiftComparator(s, start)
    const maybeMin = s.ejectRootIfLimit()
    return maybeMin === undefined
        ? parseRightBound(s, comparator)
        : s.reduceLeftBound(maybeMin, comparator)
}

export type parseBound<
    s extends StaticState,
    start extends Scanner.ComparatorStartChar,
    unscanned extends string
> = shiftComparator<start, unscanned> extends infer shiftResultOrError
    ? shiftResultOrError extends Scanner.shiftResult<
          infer comparator extends Scanner.Comparator,
          infer nextUnscanned
      >
        ? s["root"] extends number
            ? state.reduceLeftBound<s, s["root"], comparator, nextUnscanned>
            : parseRightBound<s, comparator, nextUnscanned>
        : shiftResultOrError
    : never

const shiftComparator = (
    s: DynamicState,
    start: Scanner.ComparatorStartChar
): Scanner.Comparator =>
    s.scanner.lookaheadIs("=")
        ? `${start}${s.scanner.shift()}`
        : isKeyOf(start, Scanner.oneCharComparators)
        ? start
        : s.error(singleEqualsMessage)

type shiftComparator<
    start extends Scanner.ComparatorStartChar,
    unscanned extends string
> = unscanned extends `=${infer nextUnscanned}`
    ? [`${start}=`, nextUnscanned]
    : start extends Scanner.OneCharComparator
    ? [start, unscanned]
    : error<singleEqualsMessage>

export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality`
type singleEqualsMessage = typeof singleEqualsMessage

const boundableTypes: AttributeBranches = [
    "|",
    [{ type: "array" }, { type: "string" }, { type: "array" }]
]

export const parseRightBound = (
    s: DynamicState,
    comparator: Scanner.Comparator
) => {
    const limitToken = s.scanner.shiftUntilNextTerminator()
    const limit = tryParseWellFormedNumber(
        limitToken,
        buildInvalidLimitMessage(comparator, limitToken + s.scanner.unscanned)
    )
    const openRange = s.ejectRangeIfOpen()
    if (!openRange) {
        s.intersect({
            bounds: deserializeBound(comparator, limit),
            branches: boundableTypes
        })
        return
    }
    if (!isKeyOf(comparator, Scanner.pairableComparators)) {
        return s.error(buildUnpairableComparatorMessage(comparator))
    }
    s.intersect({
        bounds: deserializeRange(openRange[0], openRange[1], comparator, limit),
        branches: boundableTypes
    })
}

export type parseRightBound<
    s extends StaticState,
    comparator extends Scanner.Comparator,
    unscanned extends string
> = Scanner.shiftUntilNextTerminator<unscanned> extends Scanner.shiftResult<
    infer scanned,
    infer nextUnscanned
>
    ? tryParseWellFormedNumber<
          scanned,
          buildInvalidLimitMessage<comparator, scanned>
      > extends infer limit
        ? limit extends number
            ? s["branches"]["range"] extends {}
                ? comparator extends Scanner.PairableComparator
                    ? state.reduceRange<
                          s,
                          s["branches"]["range"][0],
                          s["branches"]["range"][1],
                          comparator,
                          limit,
                          nextUnscanned
                      >
                    : error<buildUnpairableComparatorMessage<comparator>>
                : state.reduceSingleBound<s, comparator, limit, nextUnscanned>
            : error<limit & string>
        : never
    : never

export const buildInvalidLimitMessage = <
    comparator extends Scanner.Comparator,
    limit extends string
>(
    comparator: comparator,
    limit: limit
): buildInvalidLimitMessage<comparator, limit> =>
    `Comparator ${comparator} must be followed by a number literal (was '${limit}')`

export type buildInvalidLimitMessage<
    comparator extends Scanner.Comparator,
    limit extends string
> = `Comparator ${comparator} must be followed by a number literal (was '${limit}')`

const deserializeBound = (
    comparator: Scanner.Comparator,
    limit: number
): Bounds => {
    const bound: Bound = {
        limit
    }
    if (comparator.length === 1) {
        bound.exclusive = true
    }
    if (comparator === "==") {
        return { min: bound, max: bound }
    } else if (comparator === ">" || comparator === ">=") {
        return {
            min: bound
        }
    } else {
        return {
            max: bound
        }
    }
}

const deserializeRange = (
    minLimit: number,
    minComparator: Scanner.PairableComparator,
    maxComparator: Scanner.PairableComparator,
    maxLimit: number
): Bounds => {
    const min: Bound = {
        limit: minLimit
    }
    if (minComparator === "<") {
        min.exclusive = true
    }
    const max: Bound = {
        limit: maxLimit
    }
    if (maxComparator === "<") {
        max.exclusive = true
    }
    return {
        min,
        max
    }
}

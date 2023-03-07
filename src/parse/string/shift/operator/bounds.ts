import { stringifyRange } from "../../../../nodes/compose.ts"
import type { TypeNode } from "../../../../nodes/node.ts"
import type {
    Bound,
    MaxComparator,
    Range
} from "../../../../nodes/rules/range.ts"
import {
    compareStrictness,
    maxComparators,
    minComparators
} from "../../../../nodes/rules/range.ts"
import { throwInternalError } from "../../../../utils/errors.ts"
import type { error, keySet, mutable } from "../../../../utils/generics.ts"
import { isKeyOf, listFrom, objectKeysOf } from "../../../../utils/generics.ts"
import type { NumberLiteral } from "../../../../utils/numericLiterals.ts"
import { tryParseWellFormedNumber } from "../../../../utils/numericLiterals.ts"
import { writeUnboundableMessage } from "../../../ast/bound.ts"
import type { DynamicState } from "../../reduce/dynamic.ts"
import { writeUnpairableComparatorMessage } from "../../reduce/shared.ts"
import type { state, StaticState } from "../../reduce/static.ts"
import { Scanner } from "../scanner.ts"

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
        ? s["root"] extends NumberLiteral
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

export const parseRightBound = (
    s: DynamicState,
    comparator: Scanner.Comparator
) => {
    const limitToken = s.scanner.shiftUntilNextTerminator()
    const limit = tryParseWellFormedNumber(
        limitToken,
        writeInvalidLimitMessage(comparator, limitToken + s.scanner.unscanned)
    )
    const openRange = s.ejectRangeIfOpen()
    const rightBound = { comparator, limit }
    const range: Range = openRange
        ? !hasComparatorIn(rightBound, maxComparators)
            ? s.error(writeUnpairableComparatorMessage(comparator))
            : compareStrictness("min", openRange, rightBound) === "l"
            ? s.error(
                  writeEmptyRangeMessage({ min: openRange, max: rightBound })
              )
            : {
                  min: openRange,
                  max: rightBound
              }
        : hasComparator(rightBound, "==")
        ? rightBound
        : hasComparatorIn(rightBound, minComparators)
        ? { min: rightBound }
        : hasComparatorIn(rightBound, maxComparators)
        ? { max: rightBound }
        : throwInternalError(`Unexpected comparator '${rightBound.comparator}'`)
    s.intersect(distributeRange(range, s))
}

const distributeRange = (range: Range, s: DynamicState) => {
    const resolution = s.resolveRoot()
    const domains = objectKeysOf(resolution)
    const distributedRange: mutable<TypeNode> = {}
    const rangePredicate = { range } as const
    const isBoundable = domains.every((domain) => {
        switch (domain) {
            case "string":
                distributedRange.string = rangePredicate
                return true
            case "number":
                distributedRange.number = rangePredicate
                return true
            case "object":
                distributedRange.object = rangePredicate
                if (resolution.object === true) {
                    return false
                }
                return listFrom(resolution.object!).every(
                    (branch) => "class" in branch && branch.class === Array
                )
            default:
                return false
        }
    })
    if (!isBoundable) {
        s.error(writeUnboundableMessage(s.rootToString()))
    }
    return distributedRange
}

const hasComparator = <comparator extends Scanner.Comparator>(
    bound: Bound,
    comparator: comparator
): bound is Bound<comparator> => bound.comparator === comparator

const hasComparatorIn = <comparators extends keySet<Scanner.Comparator>>(
    bound: Bound,
    comparators: comparators
): bound is Bound<keyof comparators & Scanner.Comparator> =>
    bound.comparator in comparators

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
          writeInvalidLimitMessage<comparator, scanned>
      > extends infer limit
        ? limit extends number
            ? s["branches"]["range"] extends {}
                ? comparator extends MaxComparator
                    ? state.reduceRange<
                          s,
                          s["branches"]["range"]["limit"],
                          s["branches"]["range"]["comparator"],
                          comparator,
                          `${limit}`,
                          nextUnscanned
                      >
                    : error<writeUnpairableComparatorMessage<comparator>>
                : state.reduceSingleBound<
                      s,
                      comparator,
                      `${limit}`,
                      nextUnscanned
                  >
            : error<limit & string>
        : never
    : never

export const writeInvalidLimitMessage = <
    comparator extends Scanner.Comparator,
    limit extends string
>(
    comparator: comparator,
    limit: limit
): writeInvalidLimitMessage<comparator, limit> =>
    `Comparator ${comparator} must be followed by a number literal (was '${limit}')`

export type writeInvalidLimitMessage<
    comparator extends Scanner.Comparator,
    limit extends string
> = `Comparator ${comparator} must be followed by a number literal (was '${limit}')`

export const writeEmptyRangeMessage = (range: Range) =>
    `${stringifyRange(range)} is empty`

export type BoundableDomain = "string" | "number" | "object"

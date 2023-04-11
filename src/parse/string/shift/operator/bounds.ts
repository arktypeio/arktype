import type {
    BoundContext,
    Bounds,
    Comparator,
    MaxComparator
} from "../../../../nodes/range.js"
import { maxComparators, minComparators } from "../../../../nodes/range.js"
import { throwInternalError } from "../../../../utils/errors.js"
import type { error, keySet } from "../../../../utils/generics.js"
import { isKeyOf } from "../../../../utils/generics.js"
import type { NumberLiteral } from "../../../../utils/numericLiterals.js"
import { tryParseWellFormedNumber } from "../../../../utils/numericLiterals.js"
import type { DynamicState } from "../../reduce/dynamic.js"
import { writeUnpairableComparatorMessage } from "../../reduce/shared.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { Scanner } from "../scanner.js"

export const parseBound = (s: DynamicState, start: ComparatorStartChar) => {
    const comparator = shiftComparator(s, start)
    const maybeMin = s.ejectRootIfLimit()
    return maybeMin === undefined
        ? parseRightBound(s, comparator)
        : s.reduceLeftBound(maybeMin, comparator)
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
    : error<singleEqualsMessage>

export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality`
type singleEqualsMessage = typeof singleEqualsMessage

export const parseRightBound = (s: DynamicState, comparator: Comparator) => {
    const limitToken = s.scanner.shiftUntilNextTerminator()
    const limit = tryParseWellFormedNumber(
        limitToken,
        writeInvalidLimitMessage(comparator, limitToken + s.scanner.unscanned)
    )
    const openRange = s.ejectRangeIfOpen()
    const rightBound = { comparator, limit }
    const range: Bounds = openRange
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
    s.root = s.root?.and()
}

const hasComparator = <comparator extends Comparator>(
    bound: BoundContext,
    comparator: comparator
): bound is BoundContext<comparator> => bound.comparator === comparator

const hasComparatorIn = <comparators extends keySet<Comparator>>(
    bound: BoundContext,
    comparators: comparators
): bound is BoundContext<keyof comparators> => bound.comparator in comparators

export type parseRightBound<
    s extends StaticState,
    comparator extends Comparator,
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

export const writeEmptyRangeMessage = (range: Bounds) =>
    `${stringifyRange(range)} is empty`

export type BoundableDomain = "string" | "number" | "object"

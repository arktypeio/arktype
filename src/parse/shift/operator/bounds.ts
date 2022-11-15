import type { error } from "../../../utils/generics.js"
import { isKeyOf } from "../../../utils/generics.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import { tryParseWellFormedNumber } from "../../../utils/numericLiterals.js"
import type { DynamicState } from "../../reduce/dynamic.js"
import { Scanner } from "../../reduce/scanner.js"
import type { state, StaticState } from "../../reduce/static.js"

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
) => {
    const comparator = shift(s, start)
    const maybeMin = s.unsetRootIfLimit()
    return maybeMin === undefined
        ? parseRightBound(s, comparator)
        : s.reduceLeftBound(comparator, maybeMin)
}

export type parseBound<
    s extends StaticState,
    start extends Scanner.ComparatorStartChar,
    unscanned extends string
> = unscanned extends Scanner.shift<"=", infer nextUnscanned>
    ? delegateReduction<state.scanTo<s, nextUnscanned>, `${start}=`>
    : start extends Scanner.OneCharComparator
    ? delegateReduction<state.scanTo<s, unscanned>, start>
    : error<singleEqualsMessage>

export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality`
type singleEqualsMessage = typeof singleEqualsMessage

type delegateReduction<
    s extends StaticState,
    comparator extends Scanner.Comparator
> = s["root"] extends number
    ? state.reduceLeftBound<s, s["root"], comparator>
    : parseRightBound<s, comparator>

export const parseRightBound = (
    s: DynamicState,
    comparator: Scanner.Comparator
) => {
    const limitToken = s.scanner.shiftUntilNextTerminator()
    const limit = tryParseWellFormedNumber(
        limitToken,
        buildInvalidLimitMessage(comparator, limitToken + s.scanner.unscanned)
    )
    s.reduceRightBound(comparator, limit)
}

export type parseRightBound<
    s extends StaticState,
    comparator extends Scanner.Comparator
> = Scanner.shiftUntilNextTerminator<
    s["unscanned"]
> extends Scanner.shiftResult<infer scanned, infer nextUnscanned>
    ? tryParseWellFormedNumber<
          scanned,
          buildInvalidLimitMessage<comparator, scanned>
      > extends infer limit
        ? limit extends number
            ? state.reduceRightBound<s, comparator, limit, nextUnscanned>
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
    `Right comparator ${comparator} must be followed by a number literal (was '${limit}')`

export type buildInvalidLimitMessage<
    comparator extends Scanner.Comparator,
    limit extends string
> = `Right comparator ${comparator} must be followed by a number literal (was '${limit}')`

export const buildBoundLiteralMessage = <
    literal extends NumberLiteral,
    limit extends number,
    token extends Scanner.Comparator
>(
    literal: literal,
    limit: limit,
    comparator: token
): buildBoundLiteralMessage<literal, limit, token> =>
    `Literal value '${literal}' cannot be bound by ${limit}${comparator}`

export type buildBoundLiteralMessage<
    literal extends NumberLiteral,
    limit extends number,
    comparator extends Scanner.Comparator
> = `Literal value '${literal}' cannot be bound by ${limit}${comparator}`

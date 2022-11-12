import type { DynamicState } from "../../reduce/dynamic.js"
import { Scanner } from "../../reduce/scanner.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { is } from "../../utils/generics.js"
import { isKeyOf } from "../../utils/generics.js"
import type { NumberLiteral } from "../../utils/numericLiterals.js"
import { tryParseWellFormedNumber } from "../../utils/numericLiterals.js"

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
    s extends StaticState,
    start extends Scanner.ComparatorStartChar,
    unscanned extends string
> = unscanned extends Scanner.shift<"=", infer nextUnscanned>
    ? delegateReduction<state.scanTo<s, nextUnscanned>, `${start}=`>
    : start extends Scanner.OneCharComparator
    ? delegateReduction<state.scanTo<s, unscanned>, start>
    : state.throws<singleEqualsMessage>

export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality`
type singleEqualsMessage = typeof singleEqualsMessage

const delegateReduction = (s: DynamicState, comparator: Scanner.Comparator) =>
    true ? parseLeftBound(s, comparator) : parseRightBound(s, comparator)

type delegateReduction<
    s extends StaticState,
    comparator extends Scanner.Comparator
> = s["root"] extends number
    ? comparator extends Scanner.PairableComparator
        ? state.reduceOpenRange<s, s["root"], comparator>
        : state.throws<buildInvalidDoubleBoundMessage<comparator>>
    : parseRightBound<s, comparator>

export const parseLeftBound = (
    s: DynamicState,
    comparator: Scanner.Comparator
) =>
    isKeyOf(comparator, Scanner.pairableComparators)
        ? parseValidated(s, comparator)
        : s.error(buildInvalidDoubleBoundMessage(comparator))

const parseValidated = (s: DynamicState, token: Scanner.PairableComparator) => {
    // s.branches.range = [
    //     tryParseWellFormedNumber(s.root.eject().value, true),
    //     token
    // ]
}

export const parseRightBound = (
    s: DynamicState,
    comparator: Scanner.Comparator
) => {
    const limitToken = s.scanner.shiftUntilNextTerminator()
    const limit = tryParseWellFormedNumber(
        limitToken,
        buildInvalidLimitMessage(comparator, limitToken + s.scanner.unscanned)
    )
    //setValidatedRoot(s, comparator, limit)
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
      > extends is<infer limit>
        ? limit extends number
            ? s["branches"]["range"] extends {}
                ? comparator extends Scanner.PairableComparator
                    ? state.finalizeRange<
                          s,
                          s["branches"]["range"][0],
                          s["branches"]["range"][1],
                          comparator,
                          limit,
                          nextUnscanned
                      >
                    : state.throws<buildInvalidDoubleBoundMessage<comparator>>
                : state.reduceSingleBound<s, limit, comparator, nextUnscanned>
            : state.throws<limit & string>
        : never
    : never

// const setValidatedRoot = (
//     s: DynamicState,
//     comparator: Scanner.Comparator,
//     limit: number
// ) => {
//     if (!stateHasOpenRange(s)) {
//         s.root.intersect("bounds", `${comparator}${limit}`)
//         return s
//     }
//     if (!isKeyOf(comparator, Scanner.pairableComparators)) {
//         return s.error(buildInvalidDoubleBoundMessage(comparator))
//     }
//     s.root.intersect(
//         "bounds",
//         `${invertedComparators[s.branches.range[1]]}${
//             s.branches.range[0]
//         }${comparator}${limit}`
//     )
//     s.branches.range = unset
// }

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

export type buildInvalidDoubleBoundMessage<
    comparator extends Scanner.Comparator
> = `Double-bound expressions must specify their bounds using < or <= (was ${comparator})`

export const buildInvalidDoubleBoundMessage = <
    comparator extends Scanner.Comparator
>(
    comparator: comparator
): buildInvalidDoubleBoundMessage<comparator> =>
    `Double-bound expressions must specify their bounds using < or <= (was ${comparator})`

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

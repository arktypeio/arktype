import { Scanner } from "./scanner.js"

export const buildUnmatchedGroupCloseMessage = <unscanned extends string>(
    unscanned: unscanned
): buildUnmatchedGroupCloseMessage<unscanned> =>
    `Unmatched )${(unscanned === "" ? "" : ` before ${unscanned}`) as any}`

export type buildUnmatchedGroupCloseMessage<unscanned extends string> =
    `Unmatched )${unscanned extends "" ? "" : ` before ${unscanned}`}`

export const unclosedGroupMessage = "Missing )"

export type unclosedGroupMessage = typeof unclosedGroupMessage

export type OpenRange = [min: number, comparator: Scanner.PairableComparator]

export const buildOpenRangeMessage = <
    min extends number,
    comparator extends Scanner.Comparator
>(
    min: min,
    comparator: comparator
): buildOpenRangeMessage<min, comparator> =>
    `Left bounds are only valid when paired with right bounds (try ...${Scanner.invertedComparators[comparator]}${min})`

export type buildOpenRangeMessage<
    min extends number,
    comparator extends Scanner.Comparator
> = `Left bounds are only valid when paired with right bounds (try ...${Scanner.invertedComparators[comparator]}${min})`

export type buildUnpairableComparatorMessage<
    comparator extends Scanner.Comparator
> = `Double-bound expressions must specify their bounds using < or <= (was ${comparator})`

export const buildUnpairableComparatorMessage = <
    comparator extends Scanner.Comparator
>(
    comparator: comparator
): buildUnpairableComparatorMessage<comparator> =>
    `Double-bound expressions must specify their bounds using < or <= (was ${comparator})`

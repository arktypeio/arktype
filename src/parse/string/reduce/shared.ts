import { Scanner } from "../shift/scanner.ts"

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
> =
    `Left-bounded expressions must specify their limits using < or <= (was ${comparator})`

export const buildUnpairableComparatorMessage = <
    comparator extends Scanner.Comparator
>(
    comparator: comparator
): buildUnpairableComparatorMessage<comparator> =>
    `Left-bounded expressions must specify their limits using < or <= (was ${comparator})`

export const buildMultipleLeftBoundsMessage = <
    openLimit extends number,
    openComparator extends Scanner.PairableComparator,
    limit extends number,
    comparator extends Scanner.PairableComparator
>(
    openLimit: openLimit,
    openComparator: openComparator,
    limit: limit,
    comparator: comparator
): buildMultipleLeftBoundsMessage<
    openLimit,
    openComparator,
    limit,
    comparator
> =>
    `An expression may have at most one left bound (got ${openLimit}${openComparator}, ${limit}${comparator})`

export type buildMultipleLeftBoundsMessage<
    openLimit extends number,
    openComparator extends Scanner.PairableComparator,
    limit extends number,
    comparator extends Scanner.PairableComparator
> = `An expression may have at most one left bound (got ${openLimit}${openComparator}, ${limit}${comparator})`

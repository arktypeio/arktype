import { Scanner } from "../shift/scanner.ts"

export const writeUnmatchedGroupCloseMessage = <unscanned extends string>(
    unscanned: unscanned
): writeUnmatchedGroupCloseMessage<unscanned> =>
    `Unmatched )${(unscanned === "" ? "" : ` before ${unscanned}`) as any}`

export type writeUnmatchedGroupCloseMessage<unscanned extends string> =
    `Unmatched )${unscanned extends "" ? "" : ` before ${unscanned}`}`

export const unclosedGroupMessage = "Missing )"

export type unclosedGroupMessage = typeof unclosedGroupMessage

export type OpenRange = [min: number, comparator: Scanner.PairableComparator]

export const writeOpenRangeMessage = <
    min extends number,
    comparator extends Scanner.Comparator
>(
    min: min,
    comparator: comparator
): writeOpenRangeMessage<min, comparator> =>
    `Left bounds are only valid when paired with right bounds (try ...${Scanner.invertedComparators[comparator]}${min})`

export type writeOpenRangeMessage<
    min extends number,
    comparator extends Scanner.Comparator
> = `Left bounds are only valid when paired with right bounds (try ...${Scanner.invertedComparators[comparator]}${min})`

export type writeUnpairableComparatorMessage<
    comparator extends Scanner.Comparator
> =
    `Left-bounded expressions must specify their limits using < or <= (was ${comparator})`

export const writeUnpairableComparatorMessage = <
    comparator extends Scanner.Comparator
>(
    comparator: comparator
): writeUnpairableComparatorMessage<comparator> =>
    `Left-bounded expressions must specify their limits using < or <= (was ${comparator})`

export const writeMultipleLeftBoundsMessage = <
    openLimit extends number,
    openComparator extends Scanner.PairableComparator,
    limit extends number,
    comparator extends Scanner.PairableComparator
>(
    openLimit: openLimit,
    openComparator: openComparator,
    limit: limit,
    comparator: comparator
): writeMultipleLeftBoundsMessage<
    openLimit,
    openComparator,
    limit,
    comparator
> =>
    `An expression may have at most one left bound (parsed ${openLimit}${openComparator}, ${limit}${comparator})`

export type writeMultipleLeftBoundsMessage<
    openLimit extends number,
    openComparator extends Scanner.PairableComparator,
    limit extends number,
    comparator extends Scanner.PairableComparator
> = `An expression may have at most one left bound (parsed ${openLimit}${openComparator}, ${limit}${comparator})`

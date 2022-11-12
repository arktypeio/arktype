import { Scanner } from "./scanner.js"

export const buildUnmatchedGroupCloseMessage = <unscanned extends string>(
    unscanned: unscanned
): buildUnmatchedGroupCloseMessage<unscanned> =>
    `Unmatched )${(unscanned === "" ? "" : ` before ${unscanned}`) as any}`

export type buildUnmatchedGroupCloseMessage<unscanned extends string> =
    `Unmatched )${unscanned extends "" ? "" : ` before ${unscanned}`}`

export const unclosedGroupMessage = "Missing )"

export type unclosedGroupMessage = typeof unclosedGroupMessage

export type OpenRange = [limit: number, comparator: Scanner.PairableComparator]

export const buildOpenRangeMessage = <
    limit extends number,
    comparator extends Scanner.Comparator
>(
    limit: limit,
    comparator: comparator
): buildOpenRangeMessage<limit, comparator> =>
    `Left bounds are only valid when paired with right bounds (try ...${Scanner.invertedComparators[comparator]}${limit})`

export type buildOpenRangeMessage<
    limit extends number,
    comparator extends Scanner.Comparator
> = `Left bounds are only valid when paired with right bounds (try ...${Scanner.invertedComparators[comparator]}${limit})`

import type {
    Comparator,
    InvertedComparators,
    MinComparator
} from "../../../nodes/constraints/range.js"
import { invertedComparators } from "../../../nodes/constraints/range.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"

export type Prefix = "keyof"

export const writeUnmatchedGroupCloseMessage = <unscanned extends string>(
    unscanned: unscanned
): writeUnmatchedGroupCloseMessage<unscanned> =>
    `Unmatched )${(unscanned === "" ? "" : ` before ${unscanned}`) as any}`

export type writeUnmatchedGroupCloseMessage<unscanned extends string> =
    `Unmatched )${unscanned extends "" ? "" : ` before ${unscanned}`}`

export const unclosedGroupMessage = "Missing )"

export type unclosedGroupMessage = typeof unclosedGroupMessage

export const writeOpenRangeMessage = <
    min extends NumberLiteral,
    comparator extends MinComparator
>(
    min: min,
    comparator: comparator
): writeOpenRangeMessage<min, comparator> =>
    `Left bounds are only valid when paired with right bounds (try ...${comparator}${min})`

export type writeOpenRangeMessage<
    min extends NumberLiteral,
    comparator extends MinComparator
> = `Left bounds are only valid when paired with right bounds (try ...${comparator}${min})`

export type writeUnpairableComparatorMessage<comparator extends Comparator> =
    `Left-bounded expressions must specify their limits using < or <= (was ${comparator})`

export const writeUnpairableComparatorMessage = <comparator extends Comparator>(
    comparator: comparator
): writeUnpairableComparatorMessage<comparator> =>
    `Left-bounded expressions must specify their limits using < or <= (was ${comparator})`

export const writeMultipleLeftBoundsMessage = <
    openLimit extends NumberLiteral,
    openComparator extends MinComparator,
    limit extends NumberLiteral,
    comparator extends MinComparator
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
    `An expression may have at most one left bound (parsed ${openLimit}${invertedComparators[openComparator]}, ${limit}${invertedComparators[comparator]})`

export type writeMultipleLeftBoundsMessage<
    openLimit extends NumberLiteral,
    openComparator extends MinComparator,
    limit extends NumberLiteral,
    comparator extends MinComparator
> = `An expression may have at most one left bound (parsed ${openLimit}${InvertedComparators[openComparator]}, ${limit}${InvertedComparators[comparator]})`

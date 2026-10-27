import { inProgress, queueUnchecked, type BaseRoot } from "@ark/schema"
import type { LimitLiteral } from "../../attributes.ts"

export type StringifiablePrefixOperator = "keyof"

export const minComparators = {
	">": true,
	">=": true
} as const

export type MinComparator = keyof typeof minComparators

export const maxComparators = {
	"<": true,
	"<=": true
} as const

export type MaxComparator = keyof typeof maxComparators

export const comparators = {
	">": true,
	">=": true,
	"<": true,
	"<=": true,
	"==": true,
	"!=": true
}

export type Comparator = keyof typeof comparators

export const invertedComparators: InvertedComparators = {
	"<": ">",
	">": "<",
	"<=": ">=",
	">=": "<=",
	"==": "==",
	"!=": "!="
}

export type InvertedComparators = {
	"<": ">"
	">": "<"
	"<=": ">="
	">=": "<="
	"==": "=="
	"!=": "!="
}

export type BranchOperator = "&" | "|" | "|>"

const unaliased = (node: BaseRoot): BaseRoot =>
	node.hasKind("alias") ? node.resolution : node

// an intersection a definition writes with a cyclic operand is decided once
// definitions close, where an empty one throws as if written out
export const checkWrittenIntersection = (
	result: BaseRoot,
	l: BaseRoot,
	r: BaseRoot
): void => {
	if (
		inProgress.definitions &&
		result.hasKind("alias") &&
		result.operator === "&"
	)
		queueUnchecked(() => void unaliased(l).rawAnd(unaliased(r)), result.id)
}

export type OpenLeftBound = { limit: LimitLiteral; comparator: MinComparator }

export const writeOpenRangeMessage = <
	min extends LimitLiteral,
	comparator extends MinComparator
>(
	min: min,
	comparator: comparator
): writeOpenRangeMessage<min, comparator> =>
	`Left bounds are only valid when paired with right bounds (try ...${comparator}${min})`

export type writeOpenRangeMessage<
	min extends LimitLiteral,
	comparator extends MinComparator
> = `Left bounds are only valid when paired with right bounds (try ...${comparator}${min})`

export type writeUnpairableComparatorMessage<comparator extends Comparator> =
	`Left-bounded expressions must specify their limits using < or <= (was ${comparator})`

export const writeUnpairableComparatorMessage = <comparator extends Comparator>(
	comparator: comparator
): writeUnpairableComparatorMessage<comparator> =>
	`Left-bounded expressions must specify their limits using < or <= (was ${comparator})`

export const writeMultipleLeftBoundsMessage = <
	openLimit extends LimitLiteral,
	openComparator extends MinComparator,
	limit extends LimitLiteral,
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
	openLimit extends LimitLiteral,
	openComparator extends MinComparator,
	limit extends LimitLiteral,
	comparator extends MinComparator
> = `An expression may have at most one left bound (parsed ${openLimit}${InvertedComparators[openComparator]}, ${limit}${InvertedComparators[comparator]})`

import { In } from "../compiler/compile.js"
import type { DateLiteral } from "../parser/string/shift/operand/date.js"
import type { Constraint } from "./constraint.js"
import { ConstraintNode, ConstraintSet } from "./constraint.js"

export type LimitLiteral = number | DateLiteral

export interface BoundConstraint<comparator extends Comparator = Comparator>
	extends Constraint {
	kind: BoundKind
	comparator: comparator
	limit: number
}

export class BoundNode<
	comparator extends Comparator = Comparator
> extends ConstraintNode<BoundConstraint<comparator>> {
	condition = `${compiledSizeByBoundKind[this.kind]} ${
		this.comparator === "==" ? "===" : this.comparator
	} ${this.limit}`

	defaultDescription = `${
		this.kind === "date"
			? dateComparatorDescriptions[this.comparator]
			: numericComparatorDescriptions[this.comparator]
	} ${this.limit}`

	isMin =
		this.comparator === ">" ||
		this.comparator === ">=" ||
		this.comparator === "=="

	isMax =
		this.comparator === "<" ||
		this.comparator === "<=" ||
		this.comparator === "=="
}

const unitsByBoundKind = {
	date: "",
	number: "",
	string: "characters",
	array: "elements"
} as const

export type BoundKind = keyof typeof unitsByBoundKind

const compiledSizeByBoundKind: Record<BoundKind, string> = {
	date: `${In}.valueOf()`,
	number: In,
	string: `${In}.length`,
	array: `${In}.length`
} as const

export type Range =
	| readonly [BoundNode]
	| readonly [BoundNode<MinComparator>, BoundNode<MaxComparator>]

export class BoundSet extends ConstraintSet<Range> {
	readonly min = this[0].isMin ? this[0] : undefined
	readonly max = this[0].isMax ? this[0] : this[1]?.isMax ? this[1] : undefined

	intersect(bound: BoundNode) {
		if (this.min) {
			if (bound.isMin) {
			}
		}
		if (bound.isMin) {
		}

		return new BoundSet(bound)
	}
}

export const compareStrictness = (
	kind: "min" | "max",
	l: BoundConstraint | undefined,
	r: BoundConstraint | undefined
) =>
	!l
		? !r
			? "="
			: "r"
		: !r
		? "l"
		: l.limit === r.limit
		? // comparators of length 1 (<,>) are exclusive so have precedence
		  l.comparator.length === 1
			? r.comparator.length === 1
				? "="
				: "l"
			: r.comparator.length === 1
			? "r"
			: "="
		: kind === "min"
		? l.limit > r.limit
			? "l"
			: "r"
		: l.limit < r.limit
		? "l"
		: "r"

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
	...minComparators,
	...maxComparators,
	"==": true
}

export type Comparator = keyof typeof comparators

export const numericComparatorDescriptions = {
	"<": "less than",
	">": "more than",
	"<=": "at most",
	">=": "at least",
	"==": "exactly"
} as const satisfies Record<Comparator, string>

export const dateComparatorDescriptions = {
	"<": "before",
	">": "after",
	"<=": "at or before",
	">=": "at or after",
	"==": ""
} as const satisfies Record<Comparator, string>

export const invertedComparators = {
	"<": ">",
	">": "<",
	"<=": ">=",
	">=": "<=",
	"==": "=="
} as const satisfies Record<Comparator, Comparator>

export type InvertedComparators = typeof invertedComparators

export const writeIncompatibleRangeMessage = (l: BoundKind, r: BoundKind) =>
	`Bound kinds ${l} and ${r} are incompatible`

export type NumericallyBoundableData = string | number | readonly unknown[]

// const getRangeKind = (range: Range): BoundKind => {
//     const initialBoundKind = getBoundKind(range[0])
//     if (range[1] && initialBoundKind !== getBoundKind(range[1])) {
//         return throwParseError(
//             writeIncompatibleRangeMessage(
//                 initialBoundKind,
//                 getBoundKind(range[1])
//             )
//         )
//     }
//     return initialBoundKind
// }

// const isEqualityRangeNode = (
//     node: BoundNode
// ): node is BoundNode & { children: [Bound<"==">] } =>
//     node.children[0].comparator === "=="

// const l = rule[0].limit.valueOf()
// const r = rule[1]?.limit.valueOf()
// if (
//     l === r &&
//     rule[0].comparator === ">=" &&
//     rule[1]?.comparator === "<="
// ) {
//     // reduce a range like `1<=number<=1` to `number==1`
//     rule = [{ comparator: "==", limit: rule[0].limit }]
// }

// export const intersectRanges: PrimitiveIntersection<BoundConfig> = (l) => {
// if (l.rangeKind !== r.rangeKind) {
//     return throwParseError(
//         writeIncompatibleRangeMessage(l.rangeKind, r.rangeKind)
//     )
// }
// if (isEqualityRangeNode(l)) {
//     if (isEqualityRangeNode(r)) {
//         return l.numericEqualityValue === r.numericEqualityValue
//             ? l
//             : Disjoint.from("range", l, r)
//     }
//     return r.allows(l.numericEqualityValue)
//         ? l
//         : Disjoint.from("range", l, r)
// }
// if (isEqualityRangeNode(r)) {
//     return l.allows(r.numericEqualityValue)
//         ? r
//         : Disjoint.from("range", l, r)
// }

// const stricterMin = compareStrictness("min", l.numericMin, r.numericMin)
// const stricterMax = compareStrictness("max", l.numericMax, r.numericMax)
// if (stricterMin === "l") {
//     if (stricterMax === "r") {
//         return compareStrictness("min", l.numericMin, r.numericMax) === "l"
//             ? Disjoint.from("range", l, r)
//             : rangeNode([l.min!, r.max!])
//     }
//     return l
// }
// if (stricterMin === "r") {
//     if (stricterMax === "l") {
//         return compareStrictness("min", l.numericMax, r.numericMin) === "r"
//             ? Disjoint.from("range", l, r)
//             : rangeNode([r.min!, l.max!])
//     }
//     return r
// }
// return stricterMax === "l" ? l : r
// }

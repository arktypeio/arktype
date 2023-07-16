import { throwParseError } from "@arktype/util"
import { In } from "../compiler/compile.js"
import { Disjoint } from "../nodes/disjoint.js"
import type { DateLiteral } from "../parser/string/shift/operand/date.js"
import type { Constraint } from "./constraint.js"
import { ConstraintNode, ConstraintSet } from "./constraint.js"

export type LimitLiteral = number | DateLiteral

export interface BoundConstraint<comparator extends Comparator = Comparator>
	extends Constraint {
	bounded: BoundedKind
	comparator: comparator
	limit: number
}

export class BoundNode<
	comparator extends Comparator = Comparator
> extends ConstraintNode<BoundConstraint<comparator>> {
	condition = `${compiledSizeByBoundedKind[this.bounded]} ${
		this.comparator === "==" ? "===" : this.comparator
	} ${this.limit}`

	defaultDescription = `${
		this.bounded === "date"
			? dateComparatorDescriptions[this.comparator]
			: numericComparatorDescriptions[this.comparator]
	} ${this.limit}`

	isMin(): this is BoundConstraint<MinComparator | "=="> {
		return (
			this.comparator === ">" ||
			this.comparator === ">=" ||
			this.comparator === "=="
		)
	}

	isMax(): this is BoundConstraint<MaxComparator | "=="> {
		return (
			this.comparator === "<" ||
			this.comparator === "<=" ||
			this.comparator === "=="
		)
	}
}

const unitsByBoundedKind = {
	date: "",
	number: "",
	string: "characters",
	array: "elements"
} as const

export type BoundedKind = keyof typeof unitsByBoundedKind

const compiledSizeByBoundedKind: Record<BoundedKind, string> = {
	date: `${In}.valueOf()`,
	number: In,
	string: `${In}.length`,
	array: `${In}.length`
} as const

export type Range =
	| readonly [BoundNode]
	| readonly [BoundNode<MinComparator>, BoundNode<MaxComparator>]

export class BoundSet extends ConstraintSet<Range, BoundSet> {
	readonly bounded = this[0].bounded
	readonly min = this[0].isMin() ? this[0] : undefined
	readonly max = this[0].isMax()
		? this[0]
		: this[1]?.isMax()
		? this[1]
		: undefined

	intersect(other: BoundSet) {
		if (this.bounded !== other.bounded) {
			return throwParseError(
				writeIncompatibleRangeMessage(this.bounded, other.bounded)
			)
		}
		const stricterMin = compareStrictness("min", this.min, other.min)
		const stricterMax = compareStrictness("max", this.max, other.max)
		if (stricterMin === "l") {
			if (stricterMax === "r") {
				return compareStrictness("min", this.min, other.max) === "l"
					? Disjoint.from("range", this, other)
					: new BoundSet(this.min!, other.max!)
			}
			return this
		}
		if (stricterMin === "r") {
			if (stricterMax === "l") {
				return compareStrictness("min", this.max, other.min) === "r"
					? Disjoint.from("range", this, other)
					: new BoundSet(other.min!, this.max!)
			}
			return other
		}
		return stricterMax === "l" ? this : other
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

export const writeIncompatibleRangeMessage = (l: BoundedKind, r: BoundedKind) =>
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

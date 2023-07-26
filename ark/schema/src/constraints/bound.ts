import { throwParseError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { ConstraintRule } from "./constraint.js"
import { ConstraintNode, ConstraintSet } from "./constraint.js"

export interface BoundRule<limitKind extends LimitKind = LimitKind>
	extends ConstraintRule {
	readonly dataKind: BoundableDataKind
	readonly limitKind: limitKind
	readonly limit: number
	readonly exclusive?: true
}

export class BoundNode<
	limitKind extends LimitKind = LimitKind
> extends ConstraintNode<BoundRule, typeof BoundNode> {
	static writeDefaultDescription(def: BoundRule) {
		return `${
			def.dataKind === "date"
				? dateComparatorDescriptions[this.comparator]
				: numericComparatorDescriptions[this.comparator]
		} ${def.limit}`
	}

	intersectOwnKeys(
		other: BoundNode
	): // cast the return type so that it has the same limitKind as this
	BoundRule<limitKind> | Disjoint | null
	intersectOwnKeys(other: BoundNode) {
		if (this.dataKind !== other.dataKind) {
			return throwParseError(
				writeIncompatibleRangeMessage(this.dataKind, other.dataKind)
			)
		}
		if (this.limit > other.limit) {
			if (this.limitKind === "min") {
				return other.limitKind === "min"
					? this.rule
					: Disjoint.from("range", this, other)
			}
			return other.limitKind === "max" ? other.rule : null
		}
		if (this.limit < other.limit) {
			if (this.limitKind === "max") {
				return other.limitKind === "max"
					? this.rule
					: Disjoint.from("range", this, other)
			}
			return other.limitKind === "min" ? other.rule : null
		}
		if (this.limitKind === other.limitKind) {
			return this.exclusive ? this.rule : other.rule
		}
		return this.exclusive || other.exclusive
			? Disjoint.from("range", this, other)
			: null
	}
}

export const BoundSet = ConstraintSet<
	readonly [BoundNode] | readonly [BoundNode<"min">, BoundNode<"max">]
>

const unitsByBoundedKind = {
	date: "",
	number: "",
	string: "characters",
	array: "elements"
} as const

export type BoundableDataKind = keyof typeof unitsByBoundedKind

export type LimitKind = "min" | "max"

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

export const writeIncompatibleRangeMessage = (
	l: BoundableDataKind,
	r: BoundableDataKind
) => `Bound kinds ${l} and ${r} are incompatible`

export type NumericallyBoundableData = string | number | readonly unknown[]

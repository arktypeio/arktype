import { throwParseError } from "@arktype/util"
import type { BaseRule } from "../base.js"
import { BaseNode } from "../base.js"
import { Disjoint } from "../disjoint.js"
import { ConstraintSet } from "./constraint.js"

export interface BoundRule<limitKind extends LimitKind = LimitKind>
	extends BaseRule {
	readonly dataKind: BoundableDataKind
	readonly limitKind: limitKind
	readonly limit: number
	readonly exclusive?: true
}

export class BoundNode<
	limitKind extends LimitKind = LimitKind
> extends BaseNode<BoundRule<limitKind>, typeof BoundNode> {
	readonly comparator = boundToComparator(this)

	static writeDefaultDescription(rule: BoundRule) {
		return `${
			rule.dataKind === "date"
				? dateComparatorDescriptions[boundToComparator(rule)]
				: numericComparatorDescriptions[boundToComparator(rule)]
		} ${rule.limit}`
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

export type BoundSet = InstanceType<typeof BoundSet>

const boundToComparator = <limitKind extends LimitKind>(
	bound: BoundRule<limitKind>
) =>
	`${bound.limitKind === "min" ? ">" : "<"}${
		bound.exclusive ? "" : "="
	}` as limitKind extends "min" ? MinComparator : MaxComparator

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
	...maxComparators
}

export type Comparator = keyof typeof comparators

export const numericComparatorDescriptions = {
	"<": "less than",
	">": "more than",
	"<=": "at most",
	">=": "at least"
} as const satisfies Record<Comparator, string>

export const dateComparatorDescriptions = {
	"<": "before",
	">": "after",
	"<=": "at or before",
	">=": "at or after"
} as const satisfies Record<Comparator, string>

export const writeIncompatibleRangeMessage = (
	l: BoundableDataKind,
	r: BoundableDataKind
) => `Bound kinds ${l} and ${r} are incompatible`

export type NumericallyBoundableData = string | number | readonly unknown[]

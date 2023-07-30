import { throwParseError } from "@arktype/util"
import type { BaseAttributes, BaseConstraints } from "../base.js"
import { BaseNode } from "../base.js"
import { Disjoint } from "../disjoint.js"
import { ConstraintSet } from "./constraint.js"

export interface BoundConstraints<limitKind extends LimitKind = LimitKind>
	extends BaseConstraints {
	readonly dataKind: BoundableDataKind
	readonly limitKind: limitKind
	readonly limit: number
	readonly exclusive?: true
}

export class BoundNode<
	limitKind extends LimitKind = LimitKind
> extends BaseNode<
	typeof BoundNode,
	BoundConstraints<limitKind>,
	BaseAttributes
> {
	readonly comparator = boundToComparator(this)

	static writeDefaultDescription(rule: BoundConstraints) {
		return `${
			rule.dataKind === "date"
				? dateComparatorDescriptions[boundToComparator(rule)]
				: numericComparatorDescriptions[boundToComparator(rule)]
		} ${rule.limit}`
	}

	static intersectConstraints(l: BoundConstraints, r: BoundConstraints) {
		if (l.dataKind !== r.dataKind) {
			return throwParseError(
				writeIncompatibleRangeMessage(l.dataKind, r.dataKind)
			)
		}
		if (l.limit > r.limit) {
			if (l.limitKind === "min") {
				return r.limitKind === "min" ? l : Disjoint.from("range", l, r)
			}
			return r.limitKind === "max" ? r : null
		}
		if (l.limit < r.limit) {
			if (l.limitKind === "max") {
				return r.limitKind === "max" ? l : Disjoint.from("range", l, r)
			}
			return r.limitKind === "min" ? r : null
		}
		if (l.limitKind === r.limitKind) {
			return l.exclusive ? l : r
		}
		return l.exclusive || r.exclusive ? Disjoint.from("range", l, r) : null
	}
}

export const BoundSet = ConstraintSet<
	readonly [BoundNode] | readonly [BoundNode<"min">, BoundNode<"max">]
>

export type BoundSet = InstanceType<typeof BoundSet>

const boundToComparator = <limitKind extends LimitKind>(
	bound: BoundConstraints<limitKind>
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

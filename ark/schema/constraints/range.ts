import { isArray, throwParseError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { Orthogonal } from "../type.js"
import { BaseNode, orthogonal } from "../type.js"

export type RangeRule<limitKind extends LimitKind = LimitKind> = {
	readonly dataKind: BoundableDataKind
	readonly limitKind: limitKind
	readonly limit: number
	readonly exclusive?: true
}

export class RangeConstraint<
	limitKind extends LimitKind = LimitKind
> extends BaseNode<{
	leaf: RangeRule<limitKind>
	intersection: DoubleBounds
	rule: RangeRule<limitKind> | DoubleBounds
	attributes: {}
	disjoinable: false
}> {
	readonly kind = "range"

	protected readonly defaultDescriptionPrefix = ""

	writeDefaultDescription(): string {
		if (isArray(this.rule)) {
			return this.rule.join(" and ")
		}
		const comparisonDescription =
			this.rule.dataKind === "date"
				? this.rule.limitKind === "min"
					? this.rule.exclusive
						? "after"
						: "at or after"
					: this.rule.exclusive
					? "before"
					: "at or before"
				: this.rule.limitKind === "min"
				? this.rule.exclusive
					? "more than"
					: "at least"
				: this.rule.exclusive
				? "less than"
				: "at most"
		return `${comparisonDescription} ${this.rule.limit}`
	}

	intersectMembers(
		other: RangeConstraint // cast the rule result to the current limitKind
	): RangeRule<limitKind> | Disjoint | Orthogonal
	intersectMembers(other: RangeConstraint) {
		const l = this.rule
		const r = other.rule
		if (l.dataKind !== r.dataKind) {
			return throwParseError(
				writeIncompatibleRangeMessage(l.dataKind, r.dataKind)
			)
		}
		if (l.limit > r.limit) {
			if (l.limitKind === "min") {
				return r.limitKind === "min" ? l : Disjoint.from("range", this, other)
			}
			return r.limitKind === "max" ? r : orthogonal
		}
		if (l.limit < r.limit) {
			if (l.limitKind === "max") {
				return r.limitKind === "max" ? l : Disjoint.from("range", this, other)
			}
			return r.limitKind === "min" ? r : orthogonal
		}
		if (l.limitKind === r.limitKind) {
			return l.exclusive ? l : r
		}
		return l.exclusive || r.exclusive
			? Disjoint.from("range", this, other)
			: orthogonal
	}
}

export type Bounds = SingleBound | DoubleBounds
export type SingleBound = readonly [RangeConstraint]
export type DoubleBounds = readonly [
	RangeConstraint<"min">,
	RangeConstraint<"max">
]

const unitsByBoundedKind = {
	date: "",
	number: "",
	string: "characters",
	array: "elements"
} as const

export type BoundableDataKind = keyof typeof unitsByBoundedKind

export type LimitKind = "min" | "max"

export const writeIncompatibleRangeMessage = (
	l: BoundableDataKind,
	r: BoundableDataKind
) => `Bound kinds ${l} and ${r} are incompatible`

export type NumericallyBoundableData = string | number | readonly unknown[]

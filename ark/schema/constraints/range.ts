import { throwParseError } from "@arktype/util"
import { AttributeNode } from "../attributes/attribute.js"
import { Disjoint } from "../disjoint.js"
import type { BaseAttributes } from "../node.js"
import { ConstraintNode } from "./constraint.js"

export interface RangeRule<limitKind extends LimitKind = LimitKind>
	extends BaseAttributes {
	readonly rangeKind: RangeKindAttribute
	readonly limitKind: limitKind
	readonly limit: number
	readonly exclusive: boolean
}

export class RangeKindAttribute extends AttributeNode<BoundableDataKind> {
	intersectValues(other: this) {
		return throwParseError(
			writeIncompatibleRangeMessage(this.value, other.value)
		)
	}
}

export class RangeConstraint<
	limitKind extends LimitKind = LimitKind
> extends ConstraintNode<RangeRule<limitKind>> {
	readonly kind = "range"

	writeDefaultDescription(): string {
		const comparisonDescription =
			this.rangeKind.value === "date"
				? this.limitKind === "min"
					? this.exclusive
						? "after"
						: "at or after"
					: this.exclusive
					? "before"
					: "at or before"
				: this.limitKind === "min"
				? this.exclusive
					? "more than"
					: "at least"
				: this.exclusive
				? "less than"
				: "at most"
		return `${comparisonDescription} ${this.limit}`
	}

	hasLimitKind<limitKind extends LimitKind>(
		limitKind: limitKind
	): this is RangeConstraint<limitKind> {
		return this.limitKind === (limitKind as never)
	}

	protected reduceWithRuleOf(
		other: ConstraintNode
	): RangeRule<limitKind> | Disjoint | null {
		if (!other.hasKind("range")) {
			return null
		}
		if (this.limit > other.limit) {
			if (this.hasLimitKind("min")) {
				return other.hasLimitKind("min")
					? this
					: Disjoint.from("range", this, other)
			}
			return other.hasLimitKind(this.limitKind) ? other : null
		}
		if (this.limit < other.limit) {
			if (this.hasLimitKind("max")) {
				return other.hasLimitKind("max")
					? this
					: Disjoint.from("range", this, other)
			}
			return other.hasLimitKind(this.limitKind) ? other : null
		}
		if (other.hasLimitKind(this.limitKind)) {
			return this.exclusive ? this : other
		}
		return this.exclusive || other.exclusive
			? Disjoint.from("range", this, other)
			: null
	}
}

export type RangeInput = RangeConstraint | RangeConstraintSet
export type RangeConstraintSet = SingleBound | DoubleBounds
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

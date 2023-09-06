import { Disjoint } from "../disjoint.js"
import type { Constraint } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export type BoundKind = "date" | "number"

export interface BoundRule<limitKind extends LimitKind = LimitKind> {
	// TODO: remove this from rule
	readonly boundKind: BoundKind
	readonly limitKind: limitKind
	readonly limit: number
	readonly exclusive: boolean
}

export type BoundSet =
	| readonly [BoundConstraint]
	| readonly [BoundConstraint<"min">, BoundConstraint<"max">]

export class BoundConstraint<
	limitKind extends LimitKind = LimitKind
> extends ConstraintNode<BoundRule<limitKind>> {
	readonly kind = "bound"

	hash() {
		return ""
	}

	writeDefaultDescription() {
		return describeBound(this)
	}

	hasLimitKind<kind extends LimitKind>(
		kind: kind
	): this is BoundConstraint<kind> {
		return this.limitKind === (kind as never)
	}

	reduceWith(other: Constraint): BoundConstraint<limitKind> | Disjoint | null {
		if (other.kind !== "bound") {
			return null
		}
		if (this.limit > other.limit) {
			if (this.hasLimitKind("min")) {
				return other.limitKind === "min"
					? this
					: Disjoint.from("bound", this, other)
			}
			return other.hasLimitKind(this.limitKind) ? other : null
		}
		if (this.limit < other.limit) {
			if (this.hasLimitKind("max")) {
				return other.limitKind === "max"
					? this
					: Disjoint.from("bound", this, other)
			}
			return other.hasLimitKind(this.limitKind) ? other : null
		}
		return other.hasLimitKind(this.limitKind)
			? this.exclusive
				? this
				: other
			: this.exclusive || other.exclusive
			? Disjoint.from("bound", this, other)
			: null
	}
}

export const describeBound = (rule: BoundRule) =>
	`${
		rule.boundKind === "date"
			? describeDateComparison(rule)
			: describeNumericComparison(rule)
	} ${rule.limit}`

const describeDateComparison = (rule: BoundRule) =>
	rule.limitKind === "min"
		? rule.exclusive
			? "after"
			: "at or after"
		: rule.exclusive
		? "before"
		: "at or before"

const describeNumericComparison = (rule: BoundRule) =>
	rule.limitKind === "min"
		? rule.exclusive
			? "more than"
			: "at least"
		: rule.exclusive
		? "less than"
		: "at most"

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

import { Disjoint } from "../disjoint.js"
import type { Constraint, ConstraintSchema } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export type BoundKind = "date" | "number"

export type BoundSet =
	| readonly [BoundNode]
	| readonly [BoundNode<"min">, BoundNode<"max">]

export interface BoundSchema<limitKind extends LimitKind = LimitKind>
	extends ConstraintSchema {
	// TODO: remove this from rule
	readonly boundKind: BoundKind
	readonly limitKind: limitKind
	readonly limit: number
	readonly exclusive: boolean
}

export class BoundNode<
	limitKind extends LimitKind = LimitKind
> extends ConstraintNode<BoundSchema<limitKind>> {
	readonly kind = "bound"

	hash() {
		return ""
	}

	writeDefaultDescription() {
		return describeBound(this)
	}

	hasLimitKind<kind extends LimitKind>(kind: kind): this is BoundNode<kind> {
		return this.limitKind === (kind as never)
	}

	reduceWith(other: Constraint): BoundNode<limitKind> | Disjoint | null {
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

export const describeBound = (rule: BoundSchema) =>
	`${
		rule.boundKind === "date"
			? describeDateComparison(rule)
			: describeNumericComparison(rule)
	} ${rule.limit}`

const describeDateComparison = (rule: BoundSchema) =>
	rule.limitKind === "min"
		? rule.exclusive
			? "after"
			: "at or after"
		: rule.exclusive
		? "before"
		: "at or before"

const describeNumericComparison = (rule: BoundSchema) =>
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

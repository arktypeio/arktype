import type { satisfy } from "@arktype/util"
import { isArray, throwParseError } from "@arktype/util"
import type { UniversalAttributes } from "../attributes/attribute.js"
import { Disjoint } from "../disjoint.js"
import type { NodeDefinition } from "../node.js"
import { ConstraintNode } from "./constraint.js"

export type RangeRule<limitKind extends LimitKind = LimitKind> = {
	readonly dataKind: BoundableDataKind
	readonly limitKind: limitKind
	readonly limit: number
	readonly exclusive?: true
}

export type RangeNodeDefinition<limitKind extends LimitKind = LimitKind> =
	satisfy<
		NodeDefinition,
		{
			kind: "range"
			rule: RangeRule<limitKind>
			attributes: UniversalAttributes
			node: RangeConstraint<limitKind>
		}
	>

export class RangeConstraint<
	limitKind extends LimitKind = LimitKind
> extends ConstraintNode<RangeNodeDefinition<limitKind>> {
	readonly kind = "range"

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

	hasLimitKind<limitKind extends LimitKind>(
		limitKind: limitKind
	): this is RangeConstraint<limitKind> {
		return this.rule.limitKind === (limitKind as never)
	}

	protected reduceWithRuleOf(
		other: ConstraintNode
	): RangeRule<limitKind> | Disjoint | null {
		if (!other.hasKind("range")) {
			return null
		}
		if (this.rule.dataKind !== other.rule.dataKind) {
			return throwParseError(
				writeIncompatibleRangeMessage(this.rule.dataKind, other.rule.dataKind)
			)
		}
		if (this.rule.limit > other.rule.limit) {
			if (this.hasLimitKind("min")) {
				return other.hasLimitKind("min")
					? this.rule
					: Disjoint.from("range", this, other)
			}
			return other.hasLimitKind(this.rule.limitKind) ? other.rule : null
		}
		if (this.rule.limit < other.rule.limit) {
			if (this.hasLimitKind("max")) {
				return other.hasLimitKind("max")
					? this.rule
					: Disjoint.from("range", this, other)
			}
			return other.hasLimitKind(this.rule.limitKind) ? other.rule : null
		}
		if (other.hasLimitKind(this.rule.limitKind)) {
			return this.rule.exclusive ? this.rule : other.rule
		}
		return this.rule.exclusive || other.rule.exclusive
			? Disjoint.from("range", this, other)
			: null
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

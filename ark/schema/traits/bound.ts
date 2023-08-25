import { throwParseError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseDefinition } from "../node.js"
import { RuleNode } from "./trait.js"

export interface BoundDefinition<limitKind extends LimitKind = LimitKind>
	extends BaseDefinition {
	readonly rangeKind: BoundKindNode
	readonly limitKind: limitKind
	readonly limit: number
	readonly exclusive: boolean
}

export interface BoundKindDefinition extends BaseDefinition {
	readonly value: BoundableDataKind
}

export class BoundKindNode extends RuleNode<BoundKindDefinition> {
	intersectValues(other: this) {
		return throwParseError(
			writeIncompatibleRangeMessage(this.value, other.value)
		)
	}
}

interface Boundable {
	hasLimitKind<limitKind extends LimitKind>(
		limitKind: limitKind
	): this is BoundNode<limitKind>
}

export const Boundable =
	(abstract: {}) =>
	(input: {}): Boundable => ({
		hasLimitKind(limitKind) {
			return this.limitKind === (limitKind as never)
		}
	})

export class BoundNode<
	limitKind extends LimitKind = LimitKind
> extends RuleNode<BoundDefinition<limitKind>> {
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
	): this is BoundNode<limitKind> {
		return this.limitKind === (limitKind as never)
	}

	protected reduceRules(
		other: BoundNode
	): BoundDefinition<limitKind> | Disjoint | null {
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

export type RangeInput = BoundNode | RangeConstraintSet
export type RangeConstraintSet = SingleBound | DoubleBounds
export type SingleBound = readonly [BoundNode]
export type DoubleBounds = readonly [BoundNode<"min">, BoundNode<"max">]

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

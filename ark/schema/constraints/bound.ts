import { Disjoint } from "../disjoint.js"
import type { Basis, Constraint, ConstraintSchema } from "./constraint.js"
import { ConstraintNode, RefinementNode } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { PrototypeNode } from "./prototype.js"

export type BoundKind = "date" | "number"

export type BoundSet =
	| readonly [BoundNode]
	| readonly [BoundNode<"min">, BoundNode<"max">]

export interface BoundSchema<limitKind extends LimitKind = LimitKind>
	extends ConstraintSchema {
	readonly limitKind: limitKind
	readonly limit: number
	readonly exclusive: boolean
}

export type RelativeComparator<limitKind extends LimitKind = LimitKind> = {
	min: ">" | ">="
	max: "<" | "<="
}[limitKind]

export class BoundNode<
	limitKind extends LimitKind = LimitKind
> extends RefinementNode<BoundSchema<limitKind>, typeof BoundNode> {
	readonly kind = "bound"

	static parse(input: BoundSchema) {
		return input
	}

	comparator = `${this.limitKind === "min" ? ">" : "<"}${
		this.exclusive ? "" : "="
	}` as RelativeComparator<limitKind>

	applicableTo(
		basis: Basis | undefined
	): basis is
		| DomainNode<"number" | "string">
		| PrototypeNode<typeof Array | typeof Date> {
		if (basis === undefined) {
			return false
		}
		if (basis.hasKind("domain")) {
			return basis.rule === "number" || basis.rule === "string"
		}
		if (basis.hasKind("prototype")) {
			return basis.extendsOneOf(Array, Date)
		}
		return false
	}

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

// readonly boundKind: BoundKind
// rule.boundKind === "date"
// ? describeDateComparison(rule)
// :
export const describeBound = (rule: BoundSchema) =>
	`${describeNumericComparison(rule)} ${rule.limit}`

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

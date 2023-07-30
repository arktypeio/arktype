import type { extend } from "@arktype/util"
import { domainOf } from "@arktype/util"
import type { UniversalConstraints } from "../constraints/constraint.js"

export type UnitConstraints = extend<
	UniversalConstraints,
	{
		readonly value: EqualityConstraint
	}
>

export class UnitNode {
	readonly domain = domainOf(this.constraints.value)

	writeDefaultDescription() {
		// description is handled by EqualityConstraint
		// TODO: add reference to for objects
		return stringify(this.rule)
	}

	intersect(other: UnitNode) {}
}

export class EqualityConstraint extends Constraint<unknown> {
	writeDefaultDescription() {}

	intersectRules(other: this) {
		return this.equals(other)
			? new EqualityConstraint(this.rule)
			: Disjoint.from("unit", this, other)
	}
}

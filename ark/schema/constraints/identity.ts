import { stringify } from "@arktype/util"
import type { UniversalAttributes } from "../attributes/attribute.js"
import { Disjoint } from "../disjoint.js"
import { ConstraintNode } from "./constraint.js"

// TODO: to constraint
export class IdentityConstraint extends ConstraintNode {
	readonly kind = "identity"

	constructor(
		public rule: unknown,
		public attributes: UniversalAttributes = {}
	) {
		super()
	}

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}

	reduceWithRuleOf(other: this) {
		return other.allows(this.rule)
			? this.rule
			: Disjoint.from("identity", this, other)
	}
}

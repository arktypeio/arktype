import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { ConstraintNode } from "./constraint.js"

// TODO: to constraint
export class IdentityConstraint extends ConstraintNode<unknown> {
	readonly kind = "identity"

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

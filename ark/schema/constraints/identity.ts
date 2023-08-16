import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseAttributes } from "../node.js"
import { ConstraintNode } from "./constraint.js"

export interface IdentityRule extends BaseAttributes {
	readonly value: number
}

// TODO: to constraint
export class IdentityConstraint extends ConstraintNode<IdentityRule> {
	readonly kind = "identity"

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.value)
	}

	reduceWithRuleOf(other: this) {
		return other.allows(this.value)
			? this
			: Disjoint.from("identity", this, other)
	}
}

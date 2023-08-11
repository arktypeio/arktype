import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { Constraint } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export class IdentityConstraint extends ConstraintNode<unknown> {
	readonly kind = "identity"

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}

	intersectRules(other: Constraint) {
		return other.allows(this.rule)
			? this.rule
			: Disjoint.from("unit", this, other)
	}
}

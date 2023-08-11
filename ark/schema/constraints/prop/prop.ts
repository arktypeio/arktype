import { Disjoint } from "../../disjoint.js"
import type { Constraint } from "../constraint.js"
import { ConstraintNode } from "../constraint.js"

export class PropConstraint extends ConstraintNode<{}> {
	readonly kind = "prop"

	writeDefaultDescription() {
		return ""
	}

	intersectRules(other: Constraint) {
		return this.rule
	}
}

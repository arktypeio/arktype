import type { UniversalAttributes } from "../../attributes/attribute.js"
import { ConstraintNode } from "../constraint.js"

export class PropConstraint extends ConstraintNode<{}> {
	readonly kind = "prop"

	writeDefaultDescription() {
		return ""
	}

	reduceWithRuleOf(other: ConstraintNode) {
		if (!other.hasKind("prop")) {
			return null
		}
		return this.rule
	}
}

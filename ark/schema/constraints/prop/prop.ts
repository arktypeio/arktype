import type { BaseAttributes } from "../../node.js"
import { ConstraintNode } from "../constraint.js"

export interface PropRule extends BaseAttributes {
	readonly value: {}
}

export class PropConstraint extends ConstraintNode<PropRule> {
	readonly kind = "prop"

	writeDefaultDescription() {
		return ""
	}

	reduceWithRuleOf(other: ConstraintNode) {
		if (!other.hasKind("prop")) {
			return null
		}
		return this
	}
}

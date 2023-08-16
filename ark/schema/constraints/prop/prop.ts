import type { UniversalAttributes } from "../../attributes/attribute.js"
import { ConstraintNode } from "../constraint.js"

export interface PropRule extends UniversalAttributes {
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

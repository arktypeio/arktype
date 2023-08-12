import { BaseNode } from "../../type.js"
import { ConstraintSet } from "../constraint.js"

export class PropConstraint extends BaseNode<{
	rule: {}
	attributes: {}
	intersections: never
}> {
	readonly kind = "prop"

	writeDefaultDescription() {
		return ""
	}

	intersectRules(other: this) {
		return this.rule
	}
}

export class PropSet extends ConstraintSet<readonly PropConstraint[]> {
	readonly kind = "props"

	override writeDefaultDescription() {
		return ""
	}
}

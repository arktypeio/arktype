import { BaseNode } from "../../type.js"

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

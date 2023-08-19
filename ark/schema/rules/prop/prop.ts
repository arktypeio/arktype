import type { BaseAttributes } from "../../node.js"
import { RuleNode } from "../rule.js"

export interface PropRule extends BaseAttributes {
	readonly value: {}
}

export class PropConstraint extends RuleNode<PropRule> {
	readonly kind = "prop"

	writeDefaultDescription() {
		return ""
	}

	reduceRules(other: RuleNode) {
		if (!other.hasKind("prop")) {
			return null
		}
		return this
	}
}

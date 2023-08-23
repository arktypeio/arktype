import type { BaseDefinition } from "../../node.js"
import { RuleNode } from "../trait.js"

export interface PropRule extends BaseDefinition {
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

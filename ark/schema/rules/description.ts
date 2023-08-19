import type { BaseDefinition } from "../node.js"
import { RuleNode } from "./rule.js"

export interface DescriptionDefinition extends BaseDefinition {
	readonly value: string
}

export class DescriptionNode extends RuleNode<DescriptionDefinition> {
	readonly kind = "description"

	writeDefaultDescription() {
		return this.value
	}

	protected reduceRules(other: DescriptionNode) {
		return null
	}
}

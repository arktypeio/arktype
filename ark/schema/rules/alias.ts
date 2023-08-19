import type { BaseDefinition } from "../node.js"
import { RuleNode } from "./rule.js"

export interface AliasDefinition extends BaseDefinition {
	readonly value: string
}

export class AliasNode extends RuleNode<AliasDefinition> {
	readonly kind = "divisor"

	writeDefaultDescription() {
		return this.value
	}

	protected reduceRules(other: AliasNode) {
		return null
	}
}

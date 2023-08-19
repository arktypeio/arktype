import type { BaseDefinition } from "../node.js"
import { RuleNode } from "./rule.js"

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export interface MorphRule extends BaseDefinition {
	readonly value: string
}

export class MorphAttribute extends RuleNode<MorphRule> {
	readonly kind = "divisor"

	writeDefaultDescription() {
		return this.value
	}

	protected reduceRules(other: MorphAttribute) {
		return null
	}
}

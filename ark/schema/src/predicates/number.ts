import type { BoundSet } from "../constraints/bound.js"
import type { DivisorSet } from "../constraints/divisor.js"
import type { PredicateRule } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export interface NumberRule extends PredicateRule {
	readonly bounds?: BoundSet
	readonly divisor?: DivisorSet
}

export class NumberNode extends PredicateNode<NumberRule, typeof NumberNode> {
	static override writeDefaultBaseDescription() {
		return "a number"
	}
}

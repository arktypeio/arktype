import type { BoundSet } from "../constraints/bound.js"
import type { PatternSet } from "../constraints/pattern.js"
import type { PredicateRule } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export interface StringRule extends PredicateRule {
	readonly bounds?: BoundSet
	readonly patterns?: PatternSet
}

export class StringNode extends PredicateNode<StringRule, typeof StringNode> {
	static override writeDefaultBaseDescription() {
		return "a string"
	}
}

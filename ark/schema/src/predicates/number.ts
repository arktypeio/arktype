import type { PredicateRule } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export type NumberRule = PredicateRule<"bound" | "divisor">

export class NumberNode extends PredicateNode<NumberRule, typeof NumberNode> {
	static override writeDefaultBaseDescription() {
		return "a number"
	}
}

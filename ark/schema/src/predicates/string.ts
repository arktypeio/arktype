import type { BoundSet } from "../constraints/bound.js"
import type { PatternSet } from "../constraints/pattern.js"
import type { PredicateRule } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export type StringRule = PredicateRule<"bound" | "pattern">

export class StringNode extends PredicateNode<StringRule, typeof StringNode> {
	static override writeDefaultBaseDescription() {
		return "a string"
	}
}

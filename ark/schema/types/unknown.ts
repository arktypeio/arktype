import type { NarrowConstraint } from "../constraints/narrow.js"
import type { PredicateRule } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export interface UnknownPredicateRule extends PredicateRule {
	readonly narrow?: readonly NarrowConstraint[]
}

export class UnknownPredicate extends PredicateNode<
	unknown,
	UnknownPredicateRule
> {}

import type { NarrowConstraint } from "../constraints/narrow.js"
import type { PredicateAttributes } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export interface UnknownPredicateRule extends PredicateAttributes {
	readonly narrow?: readonly NarrowConstraint[]
}

export class UnknownPredicate extends PredicateNode<
	unknown,
	UnknownPredicateRule
> {}

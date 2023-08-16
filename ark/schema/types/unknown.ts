import type { NarrowConstraint } from "../constraints/narrow.js"
import { PredicateNode } from "./predicate.js"

export type UnknownPredicateRule = {
	readonly narrow: readonly NarrowConstraint[]
}

export class UnknownPredicate extends PredicateNode<
	unknown,
	UnknownPredicateRule
> {}

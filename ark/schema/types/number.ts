import type { extend } from "@arktype/util"
import type { DivisorConstraint } from "../constraints/divisor.js"
import type { RangeConstraintSet } from "../constraints/range.js"
import type { DomainPredicateRule } from "./domain.js"
import { PredicateNode } from "./predicate.js"

export type NumberPredicateRule = extend<
	DomainPredicateRule<"number">,
	{
		readonly range?: RangeConstraintSet
		readonly divisor?: DivisorConstraint
	}
>

export class NumberPredicate extends PredicateNode<
	unknown,
	NumberPredicateRule
> {}

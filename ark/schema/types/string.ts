import type { extend } from "@arktype/util"
import type { DivisorConstraint } from "../constraints/divisor.js"
import type { RangeConstraintSet } from "../constraints/range.js"
import type { DomainPredicateRule } from "./domain.js"
import { PredicateNode } from "./predicate.js"

export type StringPredicateRule = extend<
	DomainPredicateRule<"string">,
	{
		readonly length?: RangeConstraintSet
		readonly pattern?: DivisorConstraint
	}
>

export class StringPredicate extends PredicateNode<
	unknown,
	StringPredicateRule
> {}

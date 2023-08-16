import type { extend } from "@arktype/util"
import type { RangeConstraintSet } from "../constraints/range.js"
import type { InstancePredicateRule } from "./instance.js"
import { PredicateNode } from "./predicate.js"

export type DatePredicateRule = extend<
	InstancePredicateRule<typeof Date>,
	{
		readonly range?: RangeConstraintSet
	}
>
export class DatePredicate extends PredicateNode<
	readonly unknown[],
	DatePredicateRule
> {}

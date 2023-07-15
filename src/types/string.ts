import type {
	PatternConstraint,
	RangeConstraint
} from "../constraints/constraint.js"
import { PredicateBase } from "./predicate.js"

export class StringPredicate extends PredicateBase {
	range?:
		| readonly [RangeConstraint]
		| readonly [RangeConstraint, RangeConstraint]
	pattern?: readonly PatternConstraint[]
}

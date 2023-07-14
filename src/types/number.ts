import type { PredicateBase } from "./predicate.js"

export interface NumberPredicate extends PredicateBase {
    range?:
        | readonly [RangeConstraint]
        | readonly [RangeConstraint, RangeConstraint]
    divisor?: readonly [DivisorConstraint]
}

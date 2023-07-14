import type { PredicateBase } from "./predicate.js"

export interface StringPredicate extends PredicateBase {
    range?:
        | readonly [RangeConstraint]
        | readonly [RangeConstraint, RangeConstraint]
    pattern?: readonly PatternConstraint[]
}

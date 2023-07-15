import type { DivisorConstraint } from "../constraints/constraint.js"
import { PredicateBase } from "./predicate.js"

export class NumberPredicate extends PredicateBase {
	divisor?: DivisorConstraint
}

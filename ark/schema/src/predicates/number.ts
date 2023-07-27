import type { BoundSet } from "../constraints/bound.js"
import type { DivisibilitySet } from "../constraints/divisibility.js"
import { PredicateBase } from "./predicate.js"

export class NumberPredicate extends PredicateBase {
	range?: BoundSet
	divisibility?: DivisibilitySet
}

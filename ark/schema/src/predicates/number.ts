import type { BoundSet } from "../constraints/bound.js"
import type { DivisorNode } from "../constraints/divisor.js"
import { PredicateBase } from "./predicate.js"

export class NumberPredicate extends PredicateBase {
	readonly bounds?: BoundSet
	readonly divisor?: DivisorNode
}

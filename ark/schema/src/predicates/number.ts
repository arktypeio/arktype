import type { BoundSet } from "../constraints/bound.js"
import type { DivisorNode } from "../constraints/divisor.js"
import type { PredicateRule } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export interface StringRule extends PredicateRule {
	readonly bounds?: BoundSet
	readonly divisor?: DivisorNode
}

export class NumberNode extends PredicateNode {}

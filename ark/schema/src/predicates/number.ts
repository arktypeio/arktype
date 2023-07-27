import type { BoundSet } from "../constraints/bound.js"
import type { DivisorNode } from "../constraints/divisor.js"
import { PredicateNode } from "./predicate.js"

export class NumberNode extends PredicateNode {
	readonly bounds?: BoundSet
	readonly divisor?: DivisorNode
}

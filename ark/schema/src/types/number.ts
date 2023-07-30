import type { BoundSet } from "../constraints/bound.js"
import type { DivisorConstraint } from "../constraints/divisor.js"
import type { PredicateConstraints } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export type NumberConstraints = PredicateConstraints<{
	readonly range?: BoundSet
	readonly divisor?: DivisorConstraint
}>

export class NumberNode extends PredicateNode<NumberConstraints> {
	readonly domain = "number"

	override writeDefaultBaseDescription() {
		return "a number"
	}
}

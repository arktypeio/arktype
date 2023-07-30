import type { BoundSet } from "../constraints/bound.js"
import type { DivisorConstraint } from "../constraints/divisor.js"
import type { BaseAttributes } from "../node.js"
import { PredicateNode } from "./predicate.js"

export type NumberConstraints = {
	readonly range?: BoundSet
	readonly divisor?: DivisorConstraint
}

export class NumberNode extends PredicateNode<
	NumberConstraints,
	BaseAttributes
> {
	readonly domain = "number"

	override writeDefaultBaseDescription() {
		return "a number"
	}
}

import type { extend } from "@arktype/util"
import type { BoundSet } from "../constraints/bound.js"
import type { DomainConstraints } from "../constraints/constraint.js"
import type { DivisibilityConstraint } from "../constraints/divisibility.js"
import { PredicateNode } from "./predicate.js"

export type NumberConstraints = extend<
	DomainConstraints,
	{
		readonly range?: BoundSet
		readonly divisor?: DivisibilityConstraint
	}
>

export class NumberNode extends PredicateNode<NumberConstraints> {
	readonly domain = "number"

	override writeDefaultBaseDescription() {
		return "a number"
	}
}

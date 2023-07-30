import type { evaluate } from "@arktype/util"
import type { BoundSet } from "../constraints/bound.js"
import type { DivisorSet } from "../constraints/divisor.js"
import type { BaseAttributes } from "../node.js"
import type { PredicateConstraints } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export type NumberConstraints = evaluate<
	PredicateConstraints & {
		readonly bound?: BoundSet
		readonly divisor?: DivisorSet
	}
>

export class NumberNode extends PredicateNode<
	NumberConstraints,
	BaseAttributes
> {
	override writeDefaultBaseDescription() {
		return "a number"
	}
}

import type { evaluate } from "@arktype/util"
import type { BaseAttributes } from "../base.js"
import type { BoundSet } from "../constraints/bound.js"
import type { DivisorSet } from "../constraints/divisor.js"
import type { PredicateConstraints } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export type NumberConstraints = evaluate<
	PredicateConstraints & {
		readonly bound?: BoundSet
		readonly divisor?: DivisorSet
	}
>

export class NumberNode extends PredicateNode<
	typeof NumberNode,
	NumberConstraints,
	BaseAttributes
> {
	static override writeDefaultBaseDescription() {
		return "a number"
	}
}

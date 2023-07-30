import type { evaluate } from "@arktype/util"
import type { BaseAttributes } from "../base.js"
import type { BoundSet } from "../constraints/bound.js"
import type { PatternSet } from "../constraints/pattern.js"
import type { PredicateConstraints } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export type StringConstraints = evaluate<
	PredicateConstraints & {
		readonly bound?: BoundSet
		readonly pattern?: PatternSet
	}
>

export class StringNode extends PredicateNode<
	typeof StringNode,
	StringConstraints,
	BaseAttributes
> {
	static override writeDefaultBaseDescription() {
		return "a string"
	}
}

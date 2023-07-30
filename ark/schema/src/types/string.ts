import type { BoundSet } from "../constraints/bound.js"
import type { RegexSet } from "../constraints/regex.js"
import type { BaseAttributes } from "../node.js"
import { PredicateNode } from "./predicate.js"

export type StringConstraints = {
	readonly length?: BoundSet
	readonly pattern?: RegexSet
}

export class StringNode extends PredicateNode<
	StringConstraints,
	BaseAttributes
> {
	readonly domain = "string"

	override writeDefaultBaseDescription() {
		return "a string"
	}
}

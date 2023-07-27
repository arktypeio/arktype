import type { BoundSet } from "../constraints/bound.js"
import type { PatternSet } from "../constraints/pattern.js"
import { PredicateNode } from "./predicate.js"

export class StringNode extends PredicateNode {
	readonly bounds?: BoundSet
	readonly patterns?: PatternSet
}

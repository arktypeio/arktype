import type { BoundSet } from "../constraints/bound.js"
import type { PatternSet } from "../constraints/pattern.js"
import { PredicateBase } from "./predicate.js"

export class StringPredicate extends PredicateBase {
	readonly bounds?: BoundSet
	readonly patterns?: PatternSet
}

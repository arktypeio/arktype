import type { PredicateNode } from "./predicate.js"

export interface UnitNode extends PredicateNode {
	readonly value: unknown
}

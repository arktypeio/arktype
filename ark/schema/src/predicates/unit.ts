import type { PredicateBase } from "./predicate.js"

export interface UnitPredicate extends PredicateBase {
	readonly value: unknown
}

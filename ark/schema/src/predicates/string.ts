import type { BoundSet } from "../constraints/bound.js"
import type { RegexSet } from "../constraints/regex.js"
import { PredicateBase } from "./predicate.js"

export class StringPredicate extends PredicateBase {
	range?: BoundSet
	regex?: RegexSet
}

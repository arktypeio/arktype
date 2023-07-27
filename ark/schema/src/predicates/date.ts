import type { BoundSet } from "../constraints/bound.js"
import type { ObjectPredicate } from "./object.js"

export interface DatePredicate extends ObjectPredicate {
	range?: BoundSet
}

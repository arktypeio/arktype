import type { InstanceOfSet } from "../constraints/class.js"
import { PredicateBase } from "./predicate.js"

export class ObjectPredicate extends PredicateBase {
	readonly instanceof?: InstanceOfSet
}

import type { InstanceOfNode } from "../constraints/instanceof.js"
import { PredicateBase } from "./predicate.js"

export class ObjectPredicate extends PredicateBase {
	readonly instanceof?: InstanceOfNode
}

import type { PrototypeNode } from "../constraints/prototype.js"
import { PredicateBase } from "./predicate.js"

export class ObjectPredicate extends PredicateBase {
	readonly instance?: PrototypeNode
}

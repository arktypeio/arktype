import type { PrototypeNode } from "../constraints/prototype.js"
import type { PredicateRule } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export interface ObjectRule extends PredicateRule {
	readonly prototype?: PrototypeNode
}

export class ObjectNode extends PredicateNode {}

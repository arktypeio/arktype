import type { NodeSubclass } from "../base.js"
import type { PrototypeSet } from "../constraints/prototype.js"
import type { PredicateRule } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export interface ObjectRule extends PredicateRule {
	readonly prototype?: PrototypeSet
}

export class ObjectNode<
	rule extends ObjectRule = ObjectRule,
	subclass extends NodeSubclass<rule> = NodeSubclass<rule>
> extends PredicateNode<rule, subclass> {
	static override writeDefaultBaseDescription() {
		return "an object"
	}
}

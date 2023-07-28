import type { PrototypeNode } from "../constraints/prototype.js"
import type { PredicateRule } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export interface ObjectRule extends PredicateRule {
	readonly prototype?: PrototypeNode
}

export type ObjectSubclass<rule extends ObjectRule = ObjectRule> = {
	new (rule: rule): ObjectNode<any, any>
}

export class ObjectNode<
	rule extends ObjectRule = ObjectRule,
	subclass extends ObjectSubclass<rule> = ObjectSubclass<rule>
> extends PredicateNode<ObjectRule, subclass> {
	static override writeDefaultBaseDescription() {
		return "an object"
	}
}

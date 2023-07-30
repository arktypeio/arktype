import type { ConstructorConstraint } from "../constraints/constructor.js"
import type { PredicateConstraints } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export type ObjectConstraints = PredicateConstraints<{
	readonly instanceOf?: ConstructorConstraint
}>

export class ObjectNode<
	constraints extends ObjectConstraints
> extends PredicateNode<constraints> {
	readonly domain = "object"

	override writeDefaultBaseDescription() {
		return "an object"
	}
}

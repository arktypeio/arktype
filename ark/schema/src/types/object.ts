import type { ConstructorConstraint } from "../constraints/constructor.js"
import type { BaseAttributes } from "../node.js"
import { PredicateNode } from "./predicate.js"

export type ObjectConstraints = { readonly instanceOf?: ConstructorConstraint }

export class ObjectNode<
	constraints extends ObjectConstraints,
	attributes extends BaseAttributes
> extends PredicateNode<constraints, attributes> {
	readonly domain = "object"

	override writeDefaultBaseDescription() {
		return "an object"
	}
}

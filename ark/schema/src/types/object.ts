import type { evaluate } from "@arktype/util"
import type { PrototypeSet } from "../constraints/prototype.js"
import type { BaseAttributes } from "../node.js"
import type { PredicateConstraints } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export type ObjectConstraints = evaluate<
	PredicateConstraints & { readonly prototype?: PrototypeSet }
>

export class ObjectNode<
	constraints extends ObjectConstraints,
	attributes extends BaseAttributes
> extends PredicateNode<constraints, attributes> {
	override writeDefaultBaseDescription() {
		return "an object"
	}
}

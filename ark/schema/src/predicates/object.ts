import type { evaluate } from "@arktype/util"
import type { BaseAttributes, NodeSubclass } from "../base.js"
import type { PrototypeSet } from "../constraints/prototype.js"
import type { PredicateConstraints } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export type ObjectConstraints = evaluate<
	PredicateConstraints & { readonly prototype?: PrototypeSet }
>

export class ObjectNode<
	subclass extends NodeSubclass<constraints, attributes>,
	constraints extends ObjectConstraints,
	attributes extends BaseAttributes
> extends PredicateNode<subclass, constraints, attributes> {
	static override writeDefaultBaseDescription() {
		return "an object"
	}
}

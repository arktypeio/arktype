import type { NodeSubclass } from "../base.js"
import type { PrototypeSet } from "../constraints/prototype.js"
import type { NonUniversalConsraintKind, PredicateRule } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export type AdditionalObjectConstraintKind = Exclude<
	NonUniversalConsraintKind,
	"prototype"
>

export type ObjectRule<
	additionalConstraintKind extends AdditionalObjectConstraintKind = never
> = PredicateRule<additionalConstraintKind | "prototype">

export class ObjectNode<
	rule extends ObjectRule = ObjectRule,
	subclass extends NodeSubclass<rule> = NodeSubclass<rule>
> extends PredicateNode<rule, subclass> {
	static override writeDefaultBaseDescription() {
		return "an object"
	}
}

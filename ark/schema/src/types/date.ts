import type { BoundSet } from "../constraints/bound.js"
import { ObjectNode } from "./object.js"
import type { PredicateConstraints } from "./predicate.js"

export type DateConstraints = PredicateConstraints<{
	readonly range?: BoundSet
}>

export class DateNode extends ObjectNode<DateConstraints> {
	override writeDefaultBaseDescription() {
		return "a date"
	}
}

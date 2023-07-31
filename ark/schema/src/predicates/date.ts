import type { extend } from "@arktype/util"
import type { BoundSet } from "../constraints/bound.js"
import type { DomainConstraints } from "../constraints/constraint.js"
import { ObjectNode } from "./object.js"

export type DateConstraints = extend<
	DomainConstraints,
	{
		readonly range?: BoundSet
	}
>

export class DateNode extends ObjectNode<DateConstraints> {
	override writeDefaultBaseDescription() {
		return "a date"
	}
}

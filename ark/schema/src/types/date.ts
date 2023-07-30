import type { extend } from "@arktype/util"
import type { BoundSet } from "../constraints/bound.js"
import type { UniversalConstraints } from "../constraints/constraint.js"
import { ObjectNode } from "./object.js"

export type DateConstraints = extend<
	UniversalConstraints,
	{
		readonly range?: BoundSet
	}
>

export class DateNode extends ObjectNode<DateConstraints> {
	override writeDefaultBaseDescription() {
		return "a date"
	}
}

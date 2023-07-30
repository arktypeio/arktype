import type { extend } from "@arktype/util"
import type { BoundSet } from "../constraints/bound.js"
import type { BaseAttributes } from "../node.js"
import type { ObjectConstraints } from "./object.js"
import { ObjectNode } from "./object.js"

export type DateConstraints = extend<
	ObjectConstraints,
	{
		readonly range?: BoundSet
	}
>

export class DateNode extends ObjectNode<DateConstraints, BaseAttributes> {
	override writeDefaultBaseDescription() {
		return "a date"
	}
}

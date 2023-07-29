import type { BoundSet } from "../constraints/bound.js"
import { ObjectNode } from "./object.js"
import type { ObjectRule } from "./object.js"

export type DateRule = ObjectRule<"bound">

export class DateNode extends ObjectNode<DateRule, typeof DateNode> {
	static override writeDefaultBaseDescription() {
		return "a date"
	}
}

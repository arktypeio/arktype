import type { BoundSet } from "../constraints/bound.js"
import type { ObjectNode, ObjectRule } from "./object.js"

export interface DateRule extends ObjectRule {
	readonly bounds?: BoundSet
}

export interface DateNode extends ObjectNode {}

import type { BoundSet } from "../constraints/bound.js"
import type { ObjectNode } from "./object.js"

export interface DateNode extends ObjectNode {
	readonly bounds?: BoundSet
}

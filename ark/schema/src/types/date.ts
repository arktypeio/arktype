import type { evaluate } from "@arktype/util"
import type { BoundSet } from "../constraints/bound.js"
import type { BaseAttributes } from "../node.js"
import { ObjectNode } from "./object.js"
import type { ObjectConstraints } from "./object.js"

export type DateConstraints = evaluate<
	ObjectConstraints & { readonly bound?: BoundSet }
>

export class DateNode extends ObjectNode<DateConstraints, BaseAttributes> {
	override writeDefaultBaseDescription() {
		return "a date"
	}
}
